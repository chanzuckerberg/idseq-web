# Check for pipeline results and load them if available
require 'English'

class MonitorPipelineResults
  @sleep_quantum = 5.0

  @shutdown_requested = false

  class << self
    attr_accessor :shutdown_requested
  end

  def self.update_jobs
    PipelineRun.results_in_progress.each do |pr|
      begin
        break if @shutdown_requested
        Rails.logger.info("Monitoring results: pipeline run #{pr.id}, sample #{pr.sample_id}")
        pr.monitor_results
      rescue => exception
        LogUtil.log_err_and_airbrake("Failed monitor results for pipeline run #{pr.id}: #{exception.message}")
        LogUtil.log_backtrace(exception)
      end
    end

    PhyloTree.in_progress.each do |pt|
      begin
        break if @shutdown_requested
        Rails.logger.info("Monitoring results for phylo_tree #{pt.id}")
        pt.monitor_results
      rescue => exception
        LogUtil.log_err_and_airbrake("Failed monitor results for phylo_tree #{pt.id}: #{exception.message}")
        LogUtil.log_backtrace(exception)
      end
    end

    # "stalled uploads" are not pipeline jobs, but they fit in here better than
    # anywhere else.
    begin
      MonitorPipelineResults.alert_stalled_uploads
    rescue => exception
      LogUtil.log_err_and_airbrake("Failed to alert on stalled uploads: #{exception.message}")
      LogUtil.log_backtrace(exception)
    end
  end

  def self.alert_stalled_uploads
    samples = Sample.stalled_uploads
    created_at = samples.map { |sample| sample.created_at }.min
    role_names = samples.map { |sample| sample.user.role_name }.compact.uniq
    duration_hrs = ((Time.now.utc - created_at) / 60 / 60).round(2)
    client_updated_at = samples.map { |sample| sample.client_updated_at }.compact.max
    status_urls = samples.map { |sample| sample.status_url }
    msg = "LongRunningUploadsEvent: Samples #{samples.pluck(:id)} by #{role_names} " +
      "were created #{duration_hrs} hours ago. " +
      (client_updated_at ? "Last client ping was at #{client_updated_at}. " : "") +
      "See: #{status_urls}"
    LogUtil.log_err_and_airbrake(msg)
  end

  def self.run(duration, min_refresh_interval)
    Rails.logger.info("Monitoring results for the active pipeline runs every #{min_refresh_interval} seconds over the next #{duration / 60} minutes.")
    t_now = Time.now.to_f # unixtime
    # Will try to return as soon as duration seconds have elapsed, but not any sooner.
    t_end = t_now + duration
    # The duration of the longest update so far.
    max_work_duration = 0
    iter_count = 0
    until @shutdown_requested
      iter_count += 1
      t_iter_start = t_now
      update_jobs()
      t_now = Time.now.to_f
      max_work_duration = [t_now - t_iter_start, max_work_duration].max
      t_iter_end = [t_now, t_iter_start + min_refresh_interval].max
      break unless t_iter_end + max_work_duration < t_end
      while t_now < t_iter_end && !@shutdown_requested
        # Ensure no iteration is shorter than min_refresh_interval.
        sleep [t_iter_end - t_now, @sleep_quantum].min
        t_now = Time.now.to_f
      end
    end
    while t_now < t_end && !@shutdown_requested
      # In this case (t_end - t_now) < max_work_duration.
      sleep [t_end - t_now, @sleep_quantum].min
      t_now = Time.now.to_f
    end
    Rails.logger.info("Exited result_monitor loop after #{iter_count} iterations.")
  end
end

task "result_monitor", [:duration] => :environment do |_t, args|
  trap('SIGTERM') do
    MonitorPipelineResults.shutdown_requested = true
  end
  # spawn a new finite duration process every 60 minutes
  respawn_interval = 60 * 60
  # rate-limit status updates
  cloud_env = ["prod", "staging"].include?(Rails.env)
  checks_per_minute = cloud_env ? 4.0 : 0.2
  # make sure the system is not overwhelmed under any cirmustances
  wait_before_respawn = cloud_env ? 5 : 30
  additional_wait_after_failure = 25

  # don't show all the SQL debug info in the logs, and throttle data sent to Honeycomb
  Rails.logger.level = [1, Rails.logger.level].max
  HoneycombRails.config.sample_rate = 120

  if args[:duration] == "finite_duration"
    MonitorPipelineResults.run(respawn_interval - wait_before_respawn, 60.0 / checks_per_minute)
  else
    # infinite duration
    # HACK
    Rails.logger.info("HACK: Sleeping 30 seconds on daemon startup for prior incarnations to drain.")
    sleep 30
    until MonitorPipelineResults.shutdown_requested
      system("rake result_monitor[finite_duration]")
      sleep wait_before_respawn
      unless $CHILD_STATUS.exitstatus.zero?
        sleep additional_wait_after_failure
      end
    end
  end
end

# One-off task for testing alerts
task "alert_stalled_uploads", [] => :environment do |t, args|
  MonitorPipelineResults.alert_stalled_uploads
end