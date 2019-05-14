# TODO: (gdingle): need to call low level cache
class PrecacheReportInfo
  @queue = :q03_pipeline_run

  def self.perform(pipeline_run_id)
    pr = PipelineRun.find(pipeline_run_id)
    pr.precache_report_info!
  rescue => err
    LogUtil.log_err_and_airbrake(
      "PipelineRun #{pipeline_run_id} failed to precache report_info"
    )
    LogUtil.log_backtrace(err)
  end
end
