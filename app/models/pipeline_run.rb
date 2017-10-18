require 'open3'
require 'json'
class PipelineRun < ApplicationRecord
  belongs_to :sample
  has_one :pipeline_output

  OUTPUT_JSON_NAME = 'idseq_web_sample.json'.freeze
  STATS_JSON_NAME = 'stats.json'.freeze
  LOCAL_JSON_PATH = '/app/tmp/results_json'.freeze
  STATUS_CHECKED = 'CHECKED'.freeze
  STATUS_SUCCESS = 'SUCCEEDED'.freeze
  STATUS_FAILED = 'FAILED'.freeze
  STATUS_RUNNING = 'RUNNING'.freeze
  STATUS_ERROR = 'ERROR'.freeze # when aegea batch describe failed
  STATUS_LOADED = 'LOADED'.freeze

  before_save :check_job_status

  def self.in_progress
    where("job_status != '#{STATUS_FAILED}' OR job_status IS NULL")
      .where(pipeline_output_id: nil)
  end

  def check_job_status
    return if pipeline_output
    if job_status == STATUS_SUCCESS
      self.job_status = STATUS_CHECKED
      Resque.enqueue(LoadResultsFromS3, id)
    elsif job_status == STATUS_RUNNING && created_at < 24.hours.ago
      # Try loading the data into DB after 24 hours running the job
      Resque.enqueue(LoadResultsFromS3, id)
    end
  end

  def completed?
    return true if pipeline_output || job_status == STATUS_FAILED
  end

  def log_url
    return nil unless job_log_id
    "https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2" \
      "#logEventViewer:group=/aws/batch/job;stream=#{job_log_id}"
  end

  def update_job_status
    return if completed?
    command = "aegea batch describe #{job_id}"
    stdout, stderr, status = Open3.capture3(command)
    if status.exitstatus.zero?
      self.job_description = stdout
      job_hash = JSON.parse(job_description)
      self.job_status = job_hash['status']
      if job_hash['container'] && job_hash['container']['logStreamName']
        self.job_log_id = job_hash['container']['logStreamName']
      end
    else
      Airbrake.notify("Error for update job status for pipeline run #{id} with error #{stderr}")
      self.job_status = STATUS_ERROR
    end
    save
  end

  def local_json_path
    "#{LOCAL_JSON_PATH}/#{id}"
  end

  def load_results_from_s3
    return if pipeline_output
    output_json_s3_path = "#{sample.sample_output_s3_path}/#{OUTPUT_JSON_NAME}"
    stats_json_s3_path = "#{sample.sample_output_s3_path}/#{STATS_JSON_NAME}"
    # Get the file
    downloaded_json_path = download_file(output_json_s3_path)
    downloaded_stats_path = download_file(stats_json_s3_path)
    return unless downloaded_json_path && downloaded_stats_path
    json_dict = JSON.parse(File.read(downloaded_json_path))
    stats_array = JSON.parse(File.read(downloaded_stats_path))
    pipeline_output_dict = json_dict['pipeline_output']
    pipeline_output_dict.slice!('name', 'total_reads',
                                'remaining_reads', 'taxon_counts_attributes')

    # only keep species level counts
    taxon_counts_attributes_filtered = []
    pipeline_output_dict['taxon_counts_attributes'].each do |tcnt|
      if tcnt['tax_level'].to_i == TaxonCount::TAX_LEVEL_SPECIES
        taxon_counts_attributes_filtered << tcnt
      end
    end

    pipeline_output_dict['taxon_counts_attributes'] = taxon_counts_attributes_filtered
    pipeline_output_dict['job_stats_attributes'] = stats_array
    po = PipelineOutput.new(pipeline_output_dict)
    po.sample = sample
    po.pipeline_run = self
    po.save
    # aggregate the data at genus level
    current_date = Time.now.strftime("%Y-%m-%d")
    TaxonCount.connection.execute(
      "INSERT INTO taxon_counts(pipeline_output_id, tax_id, name,
                                tax_level, count_type, count, created_at, updated_at)
       SELECT #{po.id}, taxon_lineages.genus_taxid, taxon_lineages.genus_name,
              #{TaxonCount::TAX_LEVEL_GENUS}, taxon_counts.count_type,
              sum(taxon_counts.count), '#{current_date}', '#{current_date}'
       FROM  taxon_lineages, taxon_counts
       WHERE taxon_lineages.taxid = taxon_counts.tax_id AND
             taxon_counts.pipeline_output_id = #{po.id} AND
             taxon_counts.tax_level = #{TaxonCount::TAX_LEVEL_SPECIES}
      GROUP BY 1,2,3,4,5")
    self.pipeline_output_id = po.id
    save
    # rm the json
    _stdout, _stderr, _status = Open3.capture3("rm -f #{downloaded_json_path} #{downloaded_stats_path}")
    # generate report
    po.generate_report
  end

  def download_file(s3_path)
    command = "mkdir -p #{local_json_path};"
    command += "aws s3 cp #{s3_path} #{local_json_path}/;"
    _stdout, _stderr, status = Open3.capture3(command)
    return nil unless status.exitstatus.zero?
    "#{local_json_path}/#{File.basename(s3_path)}"
  end
end
