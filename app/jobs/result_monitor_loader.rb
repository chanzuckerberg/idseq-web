# Load a result from S3 into the db
require 'logger'
class ResultMonitorLoader
  @queue = :q03_pipeline_run
  @logger = Logger.new(STDOUT)

  def self.perform(pipeline_run_id, output)
    @logger.info("Loading #{output} for pipeline run #{pipeline_run_id}")
    pr = PipelineRun.find(pipeline_run_id)
    return if pr.completed?
    begin
      pr.update_result_status(output, PipelineRun::STATUS_LOADING)
      pr.send(PipelineRun::LOADERS_BY_OUTPUT[output])
      pr.update_result_status(output, PipelineRun::STATUS_LOADED)
    rescue
      pr.update_result_status(output, PipelineRun::STATUS_FAILED)
      Airbrake.notify("Pipeline Run #{pr.id} failed loading #{output}")
      raise
    end
  end
end
