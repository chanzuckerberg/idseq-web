# Jos to check the status of pipeline runs
require 'English'
require 'json'
require 'parallel'

PROCESS_COUNT = 20

Rails.application.config.after_initialize do
  ActiveRecord::Base.connection_pool.disconnect!

  ActiveSupport.on_load(:active_record) do
    config = ActiveRecord::Base.configurations[Rails.env] ||
             Rails.application.config.database_configuration[Rails.env]
    config['pool'] = PROCESS_COUNT
    ActiveRecord::Base.establish_connection(config)
  end
end

# Benchmark status will not be updated faster than this.
IDSEQ_BENCH_UPDATE_FREQUENCY_SECONDS = 600

# A benchmark sample will not be resubmitted faster than this.
IDSEQ_BENCH_MIN_FREQUENCY_HOURS = 1.0

# This is under version control at idseq-web/config/idseq-bench-config.json, and deployed
# by copying to the S3 location below.
IDSEQ_BENCH_BUCKET = "idseq-bench".freeze
IDSEQ_BENCH_KEY_CONFIG = "config.test.json".freeze

AWS_DEFAULT_REGION = ENV.fetch('AWS_DEFAULT_REGION') { "us-west-2" }

class CheckPipelineRuns
  @sleep_quantum = 5.0

  @shutdown_requested = false

  class << self
    attr_accessor :shutdown_requested
  end

  def self.update_pr(prid)
    unless @shutdown_requested
      pr = PipelineRun.find(prid)
      Rails.logger.info("  Checking pipeline run #{pr.id} for sample #{pr.sample_id}")
      pr.update_job_status
    end
  rescue => exception
    LogUtil.log_err_and_airbrake("Updating pipeline run #{pr.id} failed with exception: #{exception.message}")
    LogUtil.log_backtrace(exception)
  end

  def self.update_pt(ptid)
    unless @shutdown_requested
      pt = PhyloTree.find(ptid)
      Rails.logger.info("Monitoring job for phylo_tree #{pt.id}")
      pt.monitor_job
    end
  rescue => exception
    LogUtil.log_err_and_airbrake("Monitor job for phylo_tree #{pt.id} failed with exception: #{exception.message}")
    LogUtil.log_backtrace(exception)
  end

  def self.forced_update_interval
    # Force refresh well before autoscaling.EXPIRATION_PERIOD_MINUTES.
    # prod does it more often because it needs to pick up updates from
    # all other environments and adjust the autoscaling groups.
    cloud_env = ["prod", "staging"].include?(Rails.env)
    Rails.env == cloud_env ? 60 : 600
  end

  def self.autoscaling_update(autoscaling_state, t_now)
    return if Rails.env == "development"
    unless autoscaling_state
      autoscaling_state = {
        t_last: t_now - forced_update_interval,
        chunk_counts: nil,
      }
    end
    last_chunk_counts = autoscaling_state[:chunk_counts]
    new_chunk_counts = PipelineRun.count_alignment_chunks_in_progress
    if last_chunk_counts.nil?
      Rails.logger.info("Autoscaling update to #{new_chunk_counts} chunks.")
    else
      Rails.logger.info("Autoscaling update from #{last_chunk_counts} chunks to #{new_chunk_counts} chunks.")
    end
    autoscaling_state[:t_last] = t_now
    autoscaling_state[:chunk_counts] = new_chunk_counts
    autoscaling_config = {
      'mode' => 'update',
      'gsnapl' => {
        'num_chunks' => new_chunk_counts[:gsnap],
        'max_concurrent' => PipelineRun::GSNAP_MAX_CONCURRENT,
      },
      'rapsearch2' => {
        'num_chunks' => new_chunk_counts[:rapsearch],
        'max_concurrent' => PipelineRun::RAPSEARCH_MAX_CONCURRENT,
      },
      'my_environment' => Rails.env,
      'max_job_dispatch_lag_seconds' => PipelineRun::MAX_JOB_DISPATCH_LAG_SECONDS,
      'job_tag_prefix' => PipelineRun::JOB_TAG_PREFIX,
      'job_tag_keep_alive_seconds' => PipelineRun::JOB_TAG_KEEP_ALIVE_SECONDS,
      'draining_tag' => PipelineRun::DRAINING_TAG,
      'batch_configurations' => [
        {
          'queue_name' => Sample::DEFAULT_QUEUE,
          'vcpus' => Sample::DEFAULT_VCPUS,
          'region' => AWS_DEFAULT_REGION,
        },
        {
          'queue_name' => Sample::DEFAULT_QUEUE_HIMEM,
          'vcpus' => Sample::DEFAULT_VCPUS_HIMEM,
          'region' => AWS_DEFAULT_REGION,
        },
      ],
    }
    c_stdout, c_stderr, c_status = Open3.capture3("app/jobs/autoscaling.py '#{autoscaling_config.to_json}'")
    Rails.logger.info(c_stdout)
    Rails.logger.error(c_stderr) unless c_status.success? && c_stderr.blank?
    autoscaling_state
  end

  def self.benchmark_sample_name(s3_path, timestamp_str, metadata_prefix)
    # Benchmark sample names start with a prefix determined uniquely from the s3 path,
    # like so: "idseq-bench-1|".  This enables finding quickly all samples submitted for
    # a given benchmark.  That text is followed by a unix timestamp of the creation time,
    # only because within a project, sample names must be unique.  Finally, a long metadata_prefix
    # describes the benchmark contents.  The whole thing looks like
    # "idseq-bench-1|1539204106|norg_1|nacc_1|uniform_weight_per_organism|hiseq_reads|viruses|chikungunya|37124|v4"
    items = s3_path.split("/")
    result = items[-2] + "-" + items[-1] + "|"
    return result if timestamp_str.blank?
    result = result + timestamp_str + "|"
    return result if metadata_prefix.blank?
    result + metadata_prefix.gsub("__", "|") # vertical bars are prettier
  end

  def self.benchmark_sample_name_prefix(s3_path)
    benchmark_sample_name(s3_path, "", "")
  end

  def self.benchmark_has_git_commit(metadata)
    return metadata['idseq_bench_reproducible'] && metadata['idseq_bench_git_hash'].length == 40
  end

  def self.benchmark_has_configuration(metadata, s3_bucket, s3_key)
    if metadata['iss_version'] && metadata['idseq_bench_version'] && metadata['prefix']
      Rails.logger.debug("bucket: #{s3_bucket}, key: #{s3_key}/#{metadata['prefix']}.yaml")
      response = S3_CLIENT.get_object(bucket: s3_bucket, key: "#{s3_key}/#{metadata['prefix']}.yaml")
      return response.content_length > 0
    end
    return false
  end

  def self.create_sample_for_benchmark(s3_bucket, s3_key, pipeline_commit, web_commit, bm_pipeline_branch, bm_user, bm_project, bm_host, bm_comment, t_now)
    Rails.logger.debug([s3_bucket, s3_key, pipeline_commit, web_commit, bm_pipeline_branch, bm_user, bm_project, bm_host, bm_comment, t_now])
    # metadata.json is produced by idseq-bench
    s3_path = "s3://#{s3_bucket}/#{s3_key}"
    raw_metadata = `aws s3 cp #{s3_path}/metadata.json -`
    metadata = JSON.parse(raw_metadata)
    input_files_attributes = metadata['fastqs'].map do |fq|
      {
        name: fq,
        source: s3_path + "/" + fq,
        source_type: "s3",
      }
    end

    # Keep support for older benchmarks (reproducible throught git commit) while
    # checking for new reproducible conditions (configuration file in s3 and package versions)
    unless benchmark_has_git_commit(metadata) || benchmark_has_configuration(metadata, s3_bucket, s3_key)
      raise "Refusing to create sample for irreproducible benchmark #{s3_path}. Include git commit or configuration file named '#{metadata['prefix']}.yaml'."
    end

    Rails.logger.info("Creating benchmark sample from #{s3_path} with #{metadata['verified_total_reads']} reads.")
    bm_sample_name = benchmark_sample_name(s3_path, t_now.floor.to_s, metadata['prefix'])
    # Add benchmark comment to existing metadata, and dump metadata json into sample_notes.
    # Tags added here are capitalized.  If a COMMENT tag already exists in metadata, prepend to it.
    existing_comment = metadata['COMMENT']
    comment_separator = "\n"
    comment_separator = "" if existing_comment.blank?
    comment_separator = "" if bm_comment.blank?
    new_metadata = {}
    # HACK: We want COMMENT and ORIGIN to appear at the top in the json dump, and this trick does it.
    new_metadata['COMMENT'] = (bm_comment || "") + comment_separator + (existing_comment || "")
    new_metadata['ORIGIN'] = s3_path
    metadata.each do |k, v|
      next if k == "COMMENT"
      next if k == "ORIGIN"
      new_metadata[k] = v
    end
    # HACK: for benchmark 5 this string is always too long for the DB
    #   depending on the connection type you are using it may be truncated or throw an error
    #   truncating manually prevents an error
    known_organisms = metadata['verified_contents'].pluck('genome').join(", ")[0..254]
    bm_sample_params = {
      name: bm_sample_name,
      host_genome_id: bm_host.id,
      project_id: bm_project.id,
      user_id: bm_user.id,
      input_files_attributes: input_files_attributes,
      sample_organism: known_organisms,
      web_commit: web_commit,
      pipeline_commit: pipeline_commit,
      pipeline_branch: bm_pipeline_branch,
      sample_notes: JSON.pretty_generate(new_metadata),
    }
    Rails.logger.debug("")
    Rails.logger.debug("=======================================================")
    Rails.logger.debug("")
    Rails.logger.debug("CREATING BENCHMARK: #{bm_sample_name}")
    Rails.logger.debug("")
    Rails.logger.debug("=======================================================")
    Rails.logger.debug("")
    Rails.logger.debug("CREATING BENCHMARK: #{bm_sample_params}")
    # @bm_sample = Sample.new(bm_sample_params)
    # # HACK: Not really sure why we have to manually set the status to STATUS_CREATED here,
    # # but if we don't, the sample is never picked up by the uploader.
    # @bm_sample.status ||= Sample::STATUS_CREATED
    # unless @bm_sample.save
    #   raise "Error creating benchmark sample with #{JSON.pretty_generate(bm_sample_params)}."
    # end
    # Rails.logger.info("Benchmark sample #{@bm_sample.id} created successfully.")
  end

  def self.prop_get(dict, property, defaults)
    return dict[property] if dict.key?(property)
    defaults[property]
  end

  def self.benchmark_update(t_now)
    Rails.logger.info("Benchmark update.")
    # config = JSON.parse(`aws s3 cp s3://#{IDSEQ_BENCH_BUCKET}/#{IDSEQ_BENCH_CONFIG} -`)
    config = JSON.parse(`cat #{IDSEQ_BENCH_KEY_CONFIG}`)
    defaults = config['defaults']
    web_commit = ENV['GIT_VERSION'] || ""
    config['active_benchmarks'].each do |bm_props|
      s3_bucket = prop_get(bm_props, 'bucket', defaults)
      s3_key = prop_get(bm_props, 'key', defaults)
      s3_path = "s3://#{s3_bucket}/#{s3_key}"
      bm_environments = prop_get(bm_props, 'environments', defaults)
      unless bm_environments.include?(Rails.env)
        Rails.logger.info("Benchmark does not apply to #{Rails.env} environment: #{s3_path}")
        next
      end
      bm_project_name = prop_get(bm_props, 'project_name', defaults)
      bm_proj = Project.find_by(name: bm_project_name)
      unless bm_proj
        Rails.logger.info("Benchmark requires non-existent project #{bm_project_name}: #{s3_path}")
        next
      end
      bm_frequency_hours = prop_get(bm_props, 'frequency_hours', defaults)
      bm_frequency_seconds = bm_frequency_hours * 3600
      unless bm_frequency_hours >= IDSEQ_BENCH_MIN_FREQUENCY_HOURS
        Rails.logger.info("Benchmark frequency under #{IDSEQ_BENCH_MIN_FREQUENCY_HOURS} hour: #{s3_path}")
        next
      end
      bm_name_prefix = benchmark_sample_name_prefix(s3_path)
      sql_query = "
        SELECT
          id,
          project_id,
          unix_timestamp(created_at) as unixtime_of_creation
        FROM samples
        WHERE
              project_id = #{bm_proj.id}
          AND created_at > from_unixtime(#{t_now - bm_frequency_seconds})
          AND name LIKE \"#{bm_name_prefix}%\"
      "
      bm_pipeline_branch = prop_get(bm_props, "pipeline_branch", defaults)
      pipeline_commit = Sample.pipeline_commit(bm_pipeline_branch) || ""
      commit_filter = ""
      if pipeline_commit.present? && prop_get(bm_props, "trigger_on_pipeline_change", defaults)
        sql_query += "    AND pipeline_commit = \"#{pipeline_commit}\""
        commit_filter += "on " + pipeline_commit
      end
      if web_commit.present? && prop_get(bm_props, "trigger_on_webapp_change", defaults)
        sql_query += "    AND web_commit = \"#{web_commit}\""
        commit_filter += "-" + web_commit
      end
      sql_results = Sample.connection.select_all(sql_query).to_hash
      unless sql_results.empty?
        most_recent_submission = sql_results.pluck('unixtime_of_creation').max
        hours_since_last_run = Integer((t_now - most_recent_submission) / 360) / 10.0
        Rails.logger.info("Benchmark last ran #{hours_since_last_run} hours ago #{commit_filter}: #{s3_path}")
        next
      end
      Rails.logger.info("Submitting benchmark: #{s3_path}")
      bm_user_email = prop_get(bm_props, 'user_email', defaults)
      bm_user = User.find_by(email: bm_user_email)
      bm_host_name = prop_get(bm_props, 'host', defaults)
      bm_host = HostGenome.find_by(name: bm_host_name)
      bm_comment = prop_get(bm_props, 'comment', defaults)
      begin
        create_sample_for_benchmark(s3_bucket, s3_key, pipeline_commit, web_commit, bm_pipeline_branch, bm_user, bm_proj, bm_host, bm_comment, t_now)
      rescue => exception
        LogUtil.log_err_and_airbrake("Creating sample for benchmark #{s3_path} failed with exception: #{exception.message}")
        LogUtil.log_backtrace(exception)
      end
    end
  end

  def self.benchmark_update_safely_and_not_too_often(benchmark_state, t_now)
    unless benchmark_state && t_now - benchmark_state[:t_last] < IDSEQ_BENCH_UPDATE_FREQUENCY_SECONDS
      benchmark_state = { t_last: t_now }
      begin
        benchmark_update(t_now)
      rescue => exception
        LogUtil.log_err_and_airbrake("Updating benchmarks failed with error: #{exception.message}")
        LogUtil.log_backtrace(exception)
      end
    end
    benchmark_state
  end

  def self.run()
    t_now = Time.now.to_f
    benchmark_state = nil
    benchmark_state = benchmark_update_safely_and_not_too_often(benchmark_state, t_now)
    print(benchmark_state)
  end

  # def self.run(duration, min_refresh_interval)
  #   Rails.logger.info("Checking the active pipeline runs every #{min_refresh_interval} seconds over the next #{duration / 60} minutes.")
  #   t_now = Time.now.to_f # unixtime
  #   # Will try to return as soon as duration seconds have elapsed, but not any sooner.
  #   t_end = t_now + duration
  #   autoscaling_state = nil
  #   benchmark_state = nil
  #   # The duration of the longest update so far.
  #   max_work_duration = 0
  #   iter_count = 0
  #   until @shutdown_requested
  #     before_iter_timestamp = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  #     iter_count += 1
  #     t_iter_start = t_now
  #     pr_ids = PipelineRun.in_progress.pluck(:id)
  #     pt_ids = PhyloTree.in_progress.pluck(:id)
  #     Parallel.each(pr_ids, in_processes: PROCESS_COUNT) do |prid|
  #       ActiveRecord::Base.connection.reconnect!
  #       update_pr(prid)
  #     end
  #     Parallel.each(pt_ids, in_processes: PROCESS_COUNT) do |ptid|
  #       ActiveRecord::Base.connection.reconnect!
  #       update_pt(ptid)
  #     end
  #     ActiveRecord::Base.connection.reconnect!
  #     autoscaling_state = autoscaling_update(autoscaling_state, t_now)
  #     benchmark_state = benchmark_update_safely_and_not_too_often(benchmark_state, t_now)
  #     t_now = Time.now.to_f
  #     after_iter_timestamp = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  #     # HACK: This logger isn't really meant to deal with nested json
  #     #  this will appear under the message key at the top level
  #     logger_iteration_data = {
  #       message: "Pipeline Monitor Iteration Complete",
  #       duration: (after_iter_timestamp - before_iter_timestamp),
  #       pr_id_count: pr_ids.count,
  #       pt_id_count: pt_ids.count,
  #     }
  #     Rails.logger.info(JSON.generate(logger_iteration_data))
  #     max_work_duration = [t_now - t_iter_start, max_work_duration].max
  #     t_iter_end = [t_now, t_iter_start + min_refresh_interval].max
  #     break unless t_iter_end + max_work_duration < t_end
  #     while t_now < t_iter_end && !@shutdown_requested
  #       # Ensure no iteration is shorter than min_refresh_interval.
  #       sleep [t_iter_end - t_now, @sleep_quantum].min
  #       t_now = Time.now.to_f
  #     end
  #   end
  #   while t_now < t_end && !@shutdown_requested
  #     # In this case (t_end - t_now) < max_work_duration.
  #     sleep [t_end - t_now, @sleep_quantum].min
  #     t_now = Time.now.to_f
  #   end
  #   Rails.logger.info("Exited loop after #{iter_count} iterations.")
  # end
end

task "pipeline_monitor", [:duration] => :environment do |_t, args|
  CheckPipelineRuns.run
  # trap('SIGTERM') do
  #   CheckPipelineRuns.shutdown_requested = true
  # end
  # # spawn a new finite duration process every 60 minutes
  # respawn_interval = 60 * 60
  # # rate-limit status updates
  # cloud_env = ["prod", "staging"].include?(Rails.env)
  # checks_per_minute = cloud_env ? 4.0 : 1.0
  # # make sure the system is not overwhelmed under any cirmustances
  # wait_before_respawn = cloud_env ? 5 : 30
  # additional_wait_after_failure = 25

  # # don't show all the SQL debug info in the logs, and throttle data sent to Honeycomb
  # Rails.logger.level = [1, Rails.logger.level].max
  # HoneycombRails.config.sample_rate = 120

  # if args[:duration] == "finite_duration"
  #   CheckPipelineRuns.run(respawn_interval - wait_before_respawn, 60.0 / checks_per_minute)
  # else
  #   # infinite duration
  #   if cloud_env
  #     Rails.logger.info("HACK: Sleeping 30 seconds on daemon startup for prior incarnations to drain.")
  #     sleep 30
  #   end
  #   until CheckPipelineRuns.shutdown_requested
  #     system("rake pipeline_monitor[finite_duration]")
  #     sleep wait_before_respawn
  #     unless $CHILD_STATUS.exitstatus.zero?
  #       sleep additional_wait_after_failure
  #     end
  #   end
  # end
end
