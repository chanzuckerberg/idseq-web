require 'open3'
require 'csv'

module SamplesHelper
  include PipelineOutputsHelper

  def generate_sample_list_csv(formatted_samples)
    attributes = %w[sample_name uploader upload_date runtime_seconds overall_job_status
                    host_filtering_status nonhost_alignment_status postprocessing_status
                    total_reads nonhost_reads nonhost_reads_percent
                    quality_control compression_ratio tissue_type nucleotide_type
                    location host_genome notes]
    CSV.generate(headers: true) do |csv|
      csv << attributes
      formatted_samples.each do |sample_info|
        derived_output = sample_info[:derived_sample_output]
        db_sample = sample_info[:db_sample]
        run_info = sample_info[:run_info]
        data_values = { sample_name: db_sample ? db_sample[:name] : '',
                        upload_date: db_sample ? db_sample[:created_at] : '',
                        total_reads: derived_output[:pipeline_run] ? derived_output[:pipeline_run][:total_reads] : '',
                        nonhost_reads: derived_output[:summary_stats] ? derived_output[:summary_stats][:remaining_reads] : '',
                        nonhost_reads_percent: derived_output[:summary_stats] && derived_output[:summary_stats][:percent_remaining] ? derived_output[:summary_stats][:percent_remaining].round(3) : '',
                        quality_control: derived_output[:summary_stats] && derived_output[:summary_stats][:qc_percent] ? derived_output[:summary_stats][:qc_percent].round(3) : '',
                        compression_ratio: derived_output[:summary_stats] && derived_output[:summary_stats][:compression_ratio] ? derived_output[:summary_stats][:compression_ratio].round(2) : '',
                        tissue_type: db_sample ? db_sample[:sample_tissue] : '',
                        nucleotide_type: db_sample ? db_sample[:sample_template] : '',
                        location: db_sample ? db_sample[:sample_location] : '',
                        host_genome: derived_output ? derived_output[:host_genome_name] : '',
                        notes: db_sample ? db_sample[:sample_notes] : '',
                        overall_job_status: run_info ? run_info[:job_status_description] : '',
                        host_filtering_status: run_info ? run_info['Host Filtering'] : '',
                        nonhost_alignment_status: run_info ? run_info['GSNAPL/RAPSEARCH alignment'] : '',
                        postprocessing_status: run_info ? run_info['Post Processing'] : '',
                        assembly_status: run_info ? run_info['De-Novo Assembly'] : '',
                        uploader: sample_info[:uploader] ? sample_info[:uploader][:name] : '',
                        runtime_seconds: run_info ? run_info[:total_runtime] : '',
                        sample_library: db_sample ? db_sample[:sample_library] : '',
                        sample_sequencer: db_sample ? db_sample[:sample_sequencer] : '',
                        sample_date: db_sample ? db_sample[:sample_date] : '',
                        sample_input_pg: db_sample ? db_sample[:sample_input_pg] : '',
                        sample_batch: db_sample ? db_sample[:sample_batch] : '',
                        sample_diagnosis: db_sample ? db_sample[:sample_diagnosis] : '',
                        sample_organism: db_sample ? db_sample[:sample_organism] : '',
                        sample_detection: db_sample ? db_sample[:sample_detection] : '' }
        stages_to_display = [:host_filtering_status, :nonhost_alignment_status, :postprocessing_status]
        stages_to_display << :assembly_status if run_info && run_info[:with_assembly] == 1
        stage_statuses = data_values.values_at(*stages_to_display)
        if stage_statuses.any? { |status| status == "FAILED" }
          data_values[:overall_job_status] = "FAILED"
        elsif stage_statuses.any? { |status| status == "RUNNING" }
          data_values[:overall_job_status] = "RUNNING"
        elsif stage_statuses.all? { |status| status == "LOADED" }
          data_values[:overall_job_status] = "COMPLETE"
        end
        attributes_as_symbols = attributes.map(&:to_sym)
        csv << data_values.values_at(*attributes_as_symbols)
      end
    end
  end

  # Load bulk metadata from a CSV file
  def populate_metadata_bulk(csv_s3_path)
    # Load the CSV data. CSV should have columns "sample_name", "project_name", and any desired columns from Sample::METADATA_FIELDS.
    csv_data = get_s3_file(csv_s3_path)
    csv_data.delete!("\uFEFF") # Remove BOM if present (file likely comes from Excel)
    CSV.parse(csv_data, headers: true) do |row|
      # Find the right project and sample
      row_details = row.to_h
      proj = Project.find_by(name: row_details['project_name'])
      next unless proj
      sampl = Sample.find_by(project_id: proj, name: row_details['sample_name'])
      next unless sampl

      # Format the new details. Append to existing notes.
      new_details = {}
      new_details['sample_notes'] = sampl.sample_notes || ''
      row_details.each do |key, value|
        if !key || !value || key == 'sample_name' || key == 'project_name'
          next
        end
        if Sample::METADATA_FIELDS.include?(key.to_sym)
          new_details[key] = value
        else # Otherwise throw in notes
          new_details['sample_notes'] << format("\n- %s: %s", key, value)
        end
      end
      new_details['sample_notes'].strip!
      sampl.update_attributes!(new_details)
    end
  end

  def should_say_something(csv_s3_path)
    # Load the CSV data. CSV should have columns "sample_name", "project_name", and any desired columns from Sample::METADATA_FIELDS.
    csv_data = get_s3_file(csv_s3_path)
    csv_data.delete!("\uFEFF") # Remove BOM if present (file likely comes from Excel)
    CSV.parse(csv_data, headers: true) do |row|
      # Find the right project and sample
      row_details = row.to_h
      proj = Project.find_by(name: row_details['project_name'])
      next unless proj
      sampl = Sample.find_by(project_id: proj, name: row_details['sample_name'])
      next unless sampl

      # Format the new details. Append to existing notes.
      new_details = {}
      new_details['sample_notes'] = sampl.sample_notes || ''
      row_details.each do |key, value|
        if !key || !value || key == 'sample_name' || key == 'project_name'
          next
        end
        if Sample::METADATA_FIELDS.include?(key.to_sym)
          new_details[key] = value
        else # Otherwise throw in notes
          new_details['sample_notes'] << format("\n- %s: %s", key, value)
        end
      end
      new_details['sample_notes'].strip!
      sampl.update_attributes!(new_details)
    end
  end

  def host_genomes_list
    HostGenome.all.map { |h| h.slice('name', 'id') }
  end

  def get_summary_stats(jobstats)
    pr = jobstats[0].pipeline_run unless jobstats[0].nil?
    unmapped_reads = pr.nil? ? nil : pr.unmapped_reads
    last_processed_at = pr.nil? ? nil : pr.created_at
    { remaining_reads: get_remaining_reads(jobstats),
      compression_ratio: compute_compression_ratio(jobstats),
      qc_percent: compute_qc_value(jobstats),
      percent_remaining: compute_percentage_reads(jobstats),
      unmapped_reads: unmapped_reads,
      last_processed_at: last_processed_at }
  end

  def get_remaining_reads(jobstats)
    pr = jobstats[0].pipeline_run unless jobstats[0].nil?
    pr.remaining_reads unless pr.nil?
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
    pr = jobstats[0].pipeline_run unless jobstats[0].nil?
    (100.0 * pr.remaining_reads) / pr.total_reads unless pr.nil? || pr.remaining_reads.nil? || pr.total_reads.nil?
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
    s3_output, _stderr, status = Open3.capture3("aws", "s3", "ls", "#{s3_path}/")
    return unless status.exitstatus.zero?
    s3_output.chomp!
    entries = s3_output.split("\n").reject { |line| line.include? "Undetermined" }
    samples = {}
    entries.each do |file_name|
      matched_paired = InputFile::BULK_FILE_PAIRED_REGEX.match(file_name)
      matched_single = InputFile::BULK_FILE_SINGLE_REGEX.match(file_name)
      if matched_paired
        matched = matched_paired
        read_idx = matched[2].to_i - 1
      elsif matched_single
        matched = matched_single
        read_idx = 0
      else
        next
      end
      source = matched[0]
      name = matched[1]
      samples[name] ||= default_attributes.clone
      samples[name][:input_files_attributes] ||= []
      samples[name][:input_files_attributes][read_idx] = { name: source,
                                                           source: "#{s3_path}/#{source}",
                                                           source_type: InputFile::SOURCE_TYPE_S3 }
    end

    sample_list = []
    samples.each do |name, sample_attributes|
      sample_attributes[:name] = name
      if sample_attributes[:input_files_attributes].size.between?(1, 2)
        sample_list << sample_attributes
      end
    end
    sample_list
  end

  def filter_samples(samples, query)
    samples = if query == 'WAITING'
                samples.joins("LEFT OUTER JOIN pipeline_runs ON pipeline_runs.sample_id = samples.id").where("pipeline_runs.id in (select max(id) from pipeline_runs group by sample_id) or pipeline_runs.id  IS NULL ").where("samples.status = ?  or pipeline_runs.job_status is NULL", 'created')
              elsif query == 'FAILED'
                samples.joins("INNER JOIN pipeline_runs ON pipeline_runs.sample_id = samples.id").where(status: 'checked').where("pipeline_runs.id in (select max(id) from pipeline_runs group by sample_id)").where("pipeline_runs.job_status like '%FAILED'")
              elsif query == 'UPLOADING'
                samples.joins("INNER JOIN pipeline_runs ON pipeline_runs.sample_id = samples.id").where(status: 'checked').where("pipeline_runs.id in (select max(id) from pipeline_runs group by sample_id)").where("pipeline_runs.job_status NOT IN (?) and pipeline_runs.finalized != 1", %w[CHECKED FAILED])
              elsif query == 'CHECKED'
                samples.joins("INNER JOIN pipeline_runs ON pipeline_runs.sample_id = samples.id").where(status: 'checked').where("pipeline_runs.id in (select max(id) from pipeline_runs group by sample_id)").where("(pipeline_runs.job_status IN (?) or pipeline_runs.job_status like '%READY') and pipeline_runs.finalized = 1", query)
              else
                samples
              end
    samples
  end

  def get_total_runtime(pipeline_run)
    if pipeline_run.finalized?
      # total processing time (without time spent waiting), for performance evaluation
      pipeline_run.pipeline_run_stages.map { |rs| pipeline_run.ready_step && rs.step_number > pipeline_run.ready_step ? 0 : (rs.updated_at - rs.created_at) }.sum
    else
      # time since pipeline kickoff (including time spent waiting), for run diagnostics
      (Time.current - pipeline_run.created_at)
    end
  end

  def filter_by_tissue_type(samples, query)
    return samples.where("false") if query == ["none"]
    updated_query = query.map { |x| x == '-' ? nil : x }
    samples.where(sample_tissue: updated_query)
  end

  def filter_by_host(samples, query)
    return samples.where("false") if query == ["none"]
    samples.where(host_genome_id: query)
  end

  def pipeline_run_info(pipeline_run)
    pipeline_run_entry = {}
    if pipeline_run
      pipeline_run_entry[:job_status_description] = 'WAITING' if pipeline_run.job_status.nil?
      if pipeline_run.pipeline_run_stages.present?
        run_stages = pipeline_run.pipeline_run_stages
        run_stages.each do |rs|
          pipeline_run_entry[rs.name] = rs.job_status
        end
        pipeline_run_entry[:total_runtime] = get_total_runtime(pipeline_run)
        pipeline_run_entry[:with_assembly] = pipeline_run.assembly? ? 1 : 0
      else
        # old data
        pipeline_run_status = pipeline_run.job_status
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
      pipeline_run_entry[:finalized] = pipeline_run.finalized
      pipeline_run_entry[:report_ready] = pipeline_run.report_ready? ? 1 : 0
    else
      pipeline_run_entry[:job_status_description] = 'WAITING'
      pipeline_run_entry[:finalized] = 0
      pipeline_run_entry[:report_ready] = 0
    end
    pipeline_run_entry
  end

  def sample_uploader(sample)
    user = {}
    user[:name] = (sample.user.name if sample.user)
    user
  end

  def sample_derived_data(sample)
    output_data = {}
    pipeline_run = sample.pipeline_runs.first
    job_stats = pipeline_run ? pipeline_run.job_stats : nil
    summary_stats = job_stats ? get_summary_stats(job_stats) : nil
    output_data[:pipeline_run] = pipeline_run
    output_data[:host_genome_name] = sample.host_genome ? sample.host_genome.name : nil
    output_data[:job_stats] = job_stats
    output_data[:summary_stats] = summary_stats

    output_data
  end

  def format_samples(samples)
    formatted_samples = []
    samples.each_with_index do |sample|
      job_info = {}
      job_info[:db_sample] = sample
      job_info[:derived_sample_output] = sample_derived_data(sample)
      job_info[:run_info] = pipeline_run_info(sample.pipeline_runs.first)
      job_info[:uploader] = sample_uploader(sample)
      formatted_samples.push(job_info)
    end
    formatted_samples
  end
end
