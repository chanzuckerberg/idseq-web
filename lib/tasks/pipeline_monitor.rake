# Jos to check the status of pipeline runs
require 'English'

class CheckPipelineRuns
  @sleep_quantum = 5.0

  @shutdown_requested = false

  class << self
    attr_accessor :shutdown_requested
  end

  def self.update_jobs(silent)
    PipelineRun.in_progress.each do |pr|
      begin
        break if @shutdown_requested
        Rails.logger.info("  Checking pipeline run #{pr.id} for sample #{pr.sample_id}") unless silent
        pr.update_job_status
      rescue => exception
        LogUtil.log_err_and_airbrake("Failed to update pipeline run #{pr.id}")
        LogUtil.log_backtrace(exception)
      end
    end

    PhyloTree.in_progress.each do |pt|
      begin
        break if @shutdown_requested
        Rails.logger.info("Monitoring job for phylo_tree #{pt.id}") unless silent
        pt.monitor_job
      rescue => exception
        LogUtil.log_err_and_airbrake("Failed monitor job for phylo_tree #{pt.id}")
        LogUtil.log_backtrace(exception)
      end
    end
  end

  def self.forced_update_interval
    # Force refresh well before autoscaling.EXPIRATION_PERIOD_MINUTES.
    # prod does it more often because it needs to pick up updates from
    # all other environments and adjust the autoscaling groups.
    cloud_env = ["prod", "staging"].include?(Rails.env)
    Rails.env == cloud_env ? 60 : 600
  end

  def self.autoscaling_update(autoscaling_state, t_now)
    unless autoscaling_state
      autoscaling_state = {
        t_last: t_now - forced_update_interval,
        job_count: nil
      }
    end
    last_job_count = autoscaling_state[:job_count]
    t_last = autoscaling_state[:t_last]
    runs = PipelineRun.in_progress_at_stage_1_or_2
    runs = runs.where("id > 10") if Rails.env == "development"
    new_job_count = runs.count
    return autoscaling_state if new_job_count == last_job_count && ((t_now - t_last) < forced_update_interval)
    if last_job_count.nil?
      Rails.logger.info("Autoscaling update to #{new_job_count}.")
    elsif last_job_count == new_job_count
      Rails.logger.info("Forced autoscaling update at #{new_job_count} after #{t_now - t_last} seconds.")
    else
      Rails.logger.info("Autoscaling update from #{last_job_count} to #{new_job_count}.")
    end
    autoscaling_state[:t_last] = t_now
    autoscaling_state[:job_count] = new_job_count
    c_stdout, c_stderr, c_status = Open3.capture3("app/jobs/autoscaling.py update #{new_job_count} #{Rails.env}")
    Rails.logger.info(c_stdout)
    Rails.logger.error(c_stderr) unless c_status.success? && c_stderr.blank?
    autoscaling_state
  end

  def self.run(duration, min_refresh_interval)
    Rails.logger.info("Checking the active pipeline runs every #{min_refresh_interval} seconds over the next #{duration / 60} minutes.")
    t_now = Time.now.to_f # unixtime
    # Will try to return as soon as duration seconds have elapsed, but not any sooner.
    t_end = t_now + duration
    autoscaling_state = nil
    # The duration of the longest update so far.
    max_work_duration = 0
    iter_count = 0
    until @shutdown_requested
      iter_count += 1
      t_iter_start = t_now
      update_jobs(iter_count != 1)
      autoscaling_state = autoscaling_update(autoscaling_state, t_now)
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
    Rails.logger.info("Exited loop after #{iter_count} iterations.")
  end
end

task "pipeline_monitor", [:duration] => :environment do |_t, args|
  trap('SIGTERM') do
    CheckPipelineRuns.shutdown_requested = true
  end
  # spawn a new finite duration process every 60 minutes
  respawn_interval = 60 * 60
  # rate-limit status updates
  cloud_env = ["prod", "staging"].include?(Rails.env)
  checks_per_minute = cloud_env ? 4.0 : 1.0
  # make sure the system is not overwhelmed under any cirmustances
  wait_before_respawn = 5
  additional_wait_after_failure = 25

  # don't show all the SQL debug info in the logs, and throttle data sent to Honeycomb
  Rails.logger.level = [1, Rails.logger.level].max
  HoneycombRails.config.sample_rate = 120

  if args[:duration] == "finite_duration"
    CheckPipelineRuns.run(respawn_interval - wait_before_respawn, 60.0 / checks_per_minute)
  else
    # infinite duration
    # HACK
    Rails.logger.info("HACK: Sleeping 30 seconds on daemon startup for prior incarnations to drain.")
    sleep 30
    until CheckPipelineRuns.shutdown_requested
      system("rake pipeline_monitor[finite_duration]")
      sleep wait_before_respawn
      unless $CHILD_STATUS.exitstatus.zero?
        sleep additional_wait_after_failure
      end
    end
  end
end
