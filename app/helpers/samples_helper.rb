require 'open3'
require 'csv'

module SamplesHelper
  include PipelineOutputsHelper

  def generate_sample_list_csv(formatted_samples)
    attributes = ["sample_name", "uploader", "upload_date", "runtime_seconds", "overall_job_status",
                  "host_filtering_status", "nonhost_alignment_status", "postprocessing_status",
                  "total_reads", "nonhost_reads", "nonhost_reads_percent",
                  "quality_control", "compression_ratio", "tissue_type", "nucleotide_type",
                  "location", "host_genome", "notes"]
    CSV.generate(headers: true) do |csv|
      csv << attributes
      formatted_samples.each do |sample_info|
        derivedOutput = sample_info[:derived_sample_output]
        dbSample = sample_info[:db_sample]
        runInfo = sample_info[:run_info]
        data_values = { sample_name: dbSample && dbSample[:name] ? dbSample[:name] : '',
                        upload_date: dbSample && dbSample[:created_at] ? dbSample[:created_at] : '',
                        total_reads: !derivedOutput[:pipeline_output] ? '' : derivedOutput[:pipeline_output][:total_reads],
                        nonhost_reads: (!derivedOutput[:summary_stats] || !derivedOutput[:summary_stats][:remaining_reads]) ? '' : derivedOutput[:summary_stats][:remaining_reads],
                        nonhost_reads_percent: (!derivedOutput[:summary_stats] || !derivedOutput[:summary_stats][:percent_remaining]) ? '' : derivedOutput[:summary_stats][:percent_remaining].round(3),
                        quality_control: (!derivedOutput[:summary_stats] || !derivedOutput[:summary_stats][:qc_percent]) ? '' : derivedOutput[:summary_stats][:qc_percent].round(3),
                        compression_ratio: (!derivedOutput[:summary_stats] || !derivedOutput[:summary_stats][:compression_ratio]) ? '' : derivedOutput[:summary_stats][:compression_ratio].round(2),
                        tissue_type: dbSample && dbSample[:sample_tissue] ? dbSample[:sample_tissue] : '',
                        nucleotide_type: dbSample && dbSample[:sample_template] ? dbSample[:sample_template] : '',
                        location: dbSample && dbSample[:sample_location] ? dbSample[:sample_location] : '',
                        host_genome: derivedOutput && derivedOutput[:host_genome_name] ? derivedOutput[:host_genome_name] : '',
                        notes: dbSample && dbSample[:sample_notes] ? dbSample[:sample_notes] : '',
                        overall_job_status: runInfo ? runInfo[:job_status_description] : '',
                        host_filtering_status: runInfo ? runInfo['Host Filtering'] : '',
                        nonhost_alignment_status: runInfo ? runInfo['GSNAPL/RAPSEARCH alignment'] : '',
                        postprocessing_status: runInfo ? runInfo['Post Processing'] : '',
                        uploader: sample_info[:uploader] ? sample_info[:uploader][:name] : '',
                        runtime_seconds: runInfo ? runInfo[:total_runtime] : '' }
        stage_statuses = data_values.values_at(:host_filtering_status, :nonhost_alignment_status, :postprocessing_status)
        if stage_statuses.any? { |status| status == "FAILED" }
          data_values[:overall_job_status] = "FAILED"
        else if stage_statuses.any? { |status| status == "RUNNING" }
          data_values[:overall_job_status] = "RUNNING"
        else if stage_statuses.all? { |status| status == "LOADED" }
          data_values[:overall_job_status] = "COMPLETE"
        end
        attributes_as_symbols = attributes.map(&:to_sym)
        csv << data_values.values_at(*attributes_as_symbols)
      end
    end
  end

  def get_samples_in_project(project)
    Hash[project.samples.map { |s| [s.id, s.name] }]
  end

  def populate_metadata_bulk(csv_s3_path)
    # CSV should have columns "sample_name", "project_name", and any desired columns from Sample::METADATA_FIELDS
    csv = get_s3_file(csv_s3_path)
    csv.delete!("\uFEFF") # remove BOM if present (file likely comes from Excel)
    CSV.parse(csv, headers: true) do |row|
      h = row.to_h
      sample_project = Project.find_by(name: h['project_name'])
      next unless sample_project
      sample = Sample.find_by(name: h['sample_name'], project_id: sample_project.id)
      next unless sample
      metadata = h.select { |k, _v| k && Sample::METADATA_FIELDS.include?(k.to_sym) }
      sample.update_attributes!(metadata)
    end
  end

  def host_genomes_list
    HostGenome.all.map { |h| h.slice('name', 'id') }
  end

  def get_summary_stats(jobstats)
    po = jobstats[0].pipeline_output unless jobstats[0].nil?
    unmapped_reads = po.nil? ? nil : po.unmapped_reads
    last_processed_at = po.nil? ? nil : po.created_at
    { remaining_reads: get_remaining_reads(jobstats),
      compression_ratio: compute_compression_ratio(jobstats),
      qc_percent: compute_qc_value(jobstats),
      percent_remaining: compute_percentage_reads(jobstats),
      unmapped_reads: unmapped_reads,
      last_processed_at: last_processed_at }
  end

  def get_remaining_reads(jobstats)
    po = jobstats[0].pipeline_output unless jobstats[0].nil?
    po.remaining_reads unless po.nil?
  end

  def compute_compression_ratio(jobstats)
    cdhitdup_stats = jobstats.find_by(task: 'run_cdhitdup')
    (1.0 * cdhitdup_stats.reads_before) / cdhitdup_stats.reads_after unless cdhitdup_stats.nil?
  end

  def compute_qc_value(jobstats)
    priceseqfilter_stats = jobstats.find_by(task: 'run_priceseqfilter')
    (100.0 * priceseqfilter_stats.reads_after) / priceseqfilter_stats.reads_before unless priceseqfilter_stats.nil?
  end

  def compute_percentage_reads(jobstats)
    po = jobstats[0].pipeline_output unless jobstats[0].nil?
    (100.0 * po.remaining_reads) / po.total_reads unless po.nil?
  end

  def sample_status_display(sample)
    if sample.status == Sample::STATUS_CREATED
      'uploading'
    elsif sample.status == Sample::STATUS_CHECKED
      pipeline_run = sample.pipeline_runs.first
      return '' unless pipeline_run
      if pipeline_run.job_status == PipelineRun::STATUS_CHECKED
        return 'complete'
      elsif pipeline_run.job_status == PipelineRun::STATUS_FAILED
        return 'failed'
      elsif pipeline_run.job_status == PipelineRun::STATUS_RUNNING
        return 'running'
      else
        return 'initializing'
      end
    end
  end

  def parsed_samples_for_s3_path(s3_path, project_id, host_genome_id)
    default_attributes = { project_id: project_id,
                           host_genome_id: host_genome_id,
                           status: 'created' }
    s3_path.chomp!('/')
    command = "aws s3 ls #{s3_path}/ | grep -v Undetermined | grep fast"
    s3_output, _stderr, status = Open3.capture3(command)
    return unless status.exitstatus.zero?
    s3_output.chomp!
    entries = s3_output.split("\n")
    samples = {}
    entries.each do |file_name|
      matched = /([^ ]*)_R(\d)_001.(fastq.gz|fastq|fasta.gz|fasta)\z/.match(file_name)
      next unless matched
      source = matched[0]
      name = matched[1]
      read_idx = matched[2].to_i - 1
      samples[name] ||= default_attributes.clone
      samples[name][:input_files_attributes] ||= []
      samples[name][:input_files_attributes][read_idx] = { name: source,
                                                           source: "#{s3_path}/#{source}",
                                                           source_type: InputFile::SOURCE_TYPE_S3 }
    end

    sample_list = []
    samples.each do |name, sample_attributes|
      sample_attributes[:name] = name
      if sample_attributes[:input_files_attributes].size == 2
        sample_list << sample_attributes
      end
    end
    sample_list
  end

  def sample_uploaders(samples)
    all_uploaders = []
    samples.each do |s|
      user = {}
      if s.user_id.present?
        id = s.user_id
        user[:name] = User.find(id).name
      else
        user[:name] = nil
      end
      all_uploaders.push(user)
    end
    all_uploaders
  end

  def samples_output_data(samples)
    final_result = []
    samples.each do |output|
      output_data = {}
      pipeline_output = output.pipeline_runs.first ? output.pipeline_runs.first.pipeline_output : nil
      job_stats = pipeline_output ? pipeline_output.job_stats : nil
      summary_stats = job_stats ? get_summary_stats(job_stats) : nil

      output_data[:host_genome_name] = output.host_genome ? output.host_genome.name : nil
      output_data[:pipeline_output] = pipeline_output
      output_data[:job_stats] = job_stats
      output_data[:summary_stats] = summary_stats
      final_result.push(output_data)
    end
    final_result
  end

  def filter_samples(samples, query)
    samples = if query == 'WAITING'
                samples.joins("LEFT OUTER JOIN pipeline_runs ON pipeline_runs.sample_id = samples.id").where("pipeline_runs.id in (select max(id) from pipeline_runs group by sample_id) or pipeline_runs.id  IS NULL ").where("samples.status = ?  or pipeline_runs.job_status is NULL", 'created')
              elsif query == 'FAILED'
                samples.joins("INNER JOIN pipeline_runs ON pipeline_runs.sample_id = samples.id").where(status: 'checked').where("pipeline_runs.id in (select max(id) from pipeline_runs group by sample_id)").where("pipeline_runs.job_status like '%FAILED'")
              elsif query == 'UPLOADING'
                samples.joins("INNER JOIN pipeline_runs ON pipeline_runs.sample_id = samples.id").where(status: 'checked').where("pipeline_runs.id in (select max(id) from pipeline_runs group by sample_id)").where("pipeline_runs.job_status NOT IN (?) and pipeline_runs.finalized != 1", %w[CHECKED FAILED])
              elsif query == 'CHECKED'
                samples.joins("INNER JOIN pipeline_runs ON pipeline_runs.sample_id = samples.id").where(status: 'checked').where("pipeline_runs.id in (select max(id) from pipeline_runs group by sample_id)").where("pipeline_runs.job_status IN (?) and pipeline_runs.finalized = 1", query)
              else
                samples
              end
    samples
  end

  def samples_pipeline_run_info(samples)
    pipeline_run_info = []
    samples.each do |output|
      pipeline_run_entry = {}
      if output.pipeline_runs.first
        recent_pipeline_run = output.pipeline_runs.first
        pipeline_run_entry[:job_status_description] = 'WAITING' if recent_pipeline_run.job_status.nil?
        if recent_pipeline_run.pipeline_run_stages.present?
          run_stages = recent_pipeline_run.pipeline_run_stages || []
          run_stages.each do |rs|
            pipeline_run_entry[rs[:name]] = rs.job_status
          end
          pipeline_run_entry[:total_runtime] = if recent_pipeline_run.finalized?
                                                 run_stages.map { |rs| rs.updated_at - rs.created_at }.sum # total processing time (without time spent waiting), for performance evaluation
                                               else
                                                 Time.current - recent_pipeline_run.created_at # time since pipeline kickoff (including time spent waiting), for run diagnostics
                                               end
        else
          pipeline_run_status = recent_pipeline_run.job_status
          pipeline_run_entry[:job_status_description] =
            if %w[CHECKED SUCCEEDED].include?(pipeline_run_status)
              'COMPLETE'
            elsif %w[FAILED ERROR].include?(pipeline_run_status)
              'FAILED'
            elsif %w[RUNNING LOADED].include?(pipeline_run_status)
              'IN PROGRESS'
            elsif pipeline_run_status == 'RUNNABLE'
              'INITIALIZING'
            end
        end
      else
        pipeline_run_entry[:job_status_description] = 'WAITING'
      end
      pipeline_run_entry[:finalized] = output.pipeline_runs.first ? output.pipeline_runs.first.finalized : 0
      pipeline_run_info.push(pipeline_run_entry)
    end
    pipeline_run_info
  end

  def format_samples(samples)
    formatted_samples = []
    final_result = samples_output_data(samples)
    pipeline_run_info = samples_pipeline_run_info(samples)
    uploaders = sample_uploaders(samples)
    samples.each_with_index do |_sample, i|
      job_info = {}
      job_info[:db_sample] = samples[i]
      job_info[:derived_sample_output] = final_result[i]
      job_info[:run_info] = pipeline_run_info[i]
      job_info[:uploader] = uploaders[i]
      formatted_samples.push(job_info)
    end
    formatted_samples
  end
end
