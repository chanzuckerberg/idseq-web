class PhyloTree < ApplicationRecord
  include PipelineOutputsHelper
  has_and_belongs_to_many :pipeline_runs
  belongs_to :user
  belongs_to :project

  STATUS_INITIALIZED = 0
  STATUS_READY = 1
  STATUS_FAILED = 2
  STATUS_IN_PROGRESS = 3

  def self.in_progress
    where(status: STATUS_IN_PROGRESS)
  end

  def fetch_dag_version
    # Needed to build full idseq-dag output path.
    return dag_version if dag_version.present?
    # If not present yet, need to fetch it.
    # TEMP HACK:
    # Assume version folder is the only folder in phylo_trees folder.
    # Right now, assume each tree can only run once, so only 1 version ever.
    stdout, _stderr, status = Open3.capture3("aws s3 ls #{phylo_tree_output_s3_path}/ | grep PRE | awk '{print $2}' | head -n1")
    if status.exitstatus.zero?
      update(dag_version: stdout.rstrip.chomp("/"))
    end
    dag_version
  end

  def monitor_results
    output_s3 = "#{phylo_tree_output_s3_path}/#{fetch_dag_version}/phylo_tree.newick"
    file = Tempfile.new
    _stdout, _stderr, status = Open3.capture3("aws", "s3", "cp", output_s3, file.path.to_s)
    if status.exitstatus.zero?
      file.open
      self.newick = file.read
      self.status = STATUS_READY
      save
    end
    file.close
    file.unlink
  end

  def monitor_job(throttle = true)
    # Detect if batch job has failed so we can stop polling for results.
    # Also, populate job_log_id.
    return if throttle && rand >= 0.1 # if throttling, do time-consuming aegea checks only 10% of the time
    job_status, self.job_log_id, _job_hash, self.job_description = PipelineRunStage.job_info(job_id, id)
    self.status = STATUS_FAILED if job_status == PipelineRunStage::STATUS_FAILED
    save
  end

  def aegea_command(base_command)
    "aegea batch submit --command=\"#{base_command}\" " \
    " --storage /mnt=#{Sample::DEFAULT_STORAGE_IN_GB} --volume-type gp2 --ecr-image idseq_phylo --memory #{Sample::DEFAULT_MEMORY_IN_MB}" \
    " --queue #{Sample::DEFAULT_QUEUE} --vcpus #{Sample::DEFAULT_VCPUS} --job-role idseq-pipeline"
  end

  def upload_taxon_fasta_inputs_and_return_names
    taxon_fasta_files = []
    pipeline_run_ids.each do |pr_id|
      pr = PipelineRun.find(pr_id)
      taxon_name = pr.taxon_counts.find_by(tax_id: taxid).name.gsub(/\W/, '-')
      sample_name = pr.sample.name.downcase.gsub(/\W/, '-')
      taxon_fasta_basename = "#{sample_name}__#{taxon_name}.fasta"

      # Make taxon fasta and upload into phylo_tree_output_s3_path
      fasta_data = get_taxid_fasta_from_pipeline_run(pr, taxid, tax_level, 'NT')
      file = Tempfile.new
      file.write(fasta_data)
      file.close
      _stdout, _stderr, status = Open3.capture3("aws", "s3", "cp", file.path.to_s, "#{phylo_tree_output_s3_path}/#{taxon_fasta_basename}")
      file.unlink
      if status.exitstatus.zero?
        taxon_fasta_files << taxon_fasta_basename
      else
        Airbrake.notify("Failed S3 upload of #{taxon_fasta_basename} for tree #{id}")
      end
    end

    taxon_fasta_files
  end

  def job_command
    taxon_fasta_files = upload_taxon_fasta_inputs_and_return_names
    attribute_dict = {
      phylo_tree_output_s3_path: phylo_tree_output_s3_path,
      taxon_fasta_files: taxon_fasta_files,
      taxid: taxid
    }
    dag_commands = prepare_dag("phylo_tree", attribute_dict)

    install_pipeline = "pip install --upgrade git+git://github.com/chanzuckerberg/s3mi.git; " \
      "cd /mnt; " \
      "git clone https://github.com/chanzuckerberg/idseq-dag.git; " \
      "cd idseq-dag; " \
      "git checkout charles/trees; " \
      "pip3 install -e . --upgrade"

    base_command = [install_pipeline, dag_commands].join("; ")
    aegea_command(base_command)
  end

  def phylo_tree_output_s3_path
    "s3://#{SAMPLES_BUCKET_NAME}/phylo_trees/#{id}"
  end

  def prepare_dag(dag_name, attribute_dict, key_s3_params = nil)
    dag_s3 = "#{phylo_tree_output_s3_path}/#{dag_name}.json"

    dag = DagGenerator.new("app/lib/dags/#{dag_name}.json.erb",
                           project_id,
                           nil,
                           nil,
                           attribute_dict)
    self.dag_json = dag.render

    `echo '#{dag_json}' | aws s3 cp - #{dag_s3}`

    # Generate job command
    dag_path_on_worker = "/mnt/#{dag_name}.json"
    download_dag = "aws s3 cp #{dag_s3} #{dag_path_on_worker}"
    execute_dag = "idseq_dag #{key_s3_params} #{dag_path_on_worker}"
    [download_dag, execute_dag].join(";")
  end

  def kickoff
    return unless [STATUS_INITIALIZED, STATUS_FAILED].include?(status)
    self.command_stdout, self.command_stderr, status = Open3.capture3(job_command)
    if status.exitstatus.zero?
      output = JSON.parse(command_stdout)
      self.job_id = output['jobId']
      self.status = STATUS_IN_PROGRESS
    else
      self.status = STATUS_FAILED
    end
    save
    monitor_job(false) # want to populate job_log_id immediately
  end
end
