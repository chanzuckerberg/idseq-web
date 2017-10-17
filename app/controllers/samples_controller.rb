class SamplesController < ApplicationController
  include ReportHelper
  include SamplesHelper
  before_action :login_required, only: [:new, :update, :destroy, :edit, :reupload_source, :kickoff_pipeline]
  before_action :set_sample, only: [:show, :edit, :update, :destroy, :reupload_source, :kickoff_pipeline, :pipeline_runs]
  acts_as_token_authentication_handler_for User, only: [:create], fallback: :devise
  protect_from_forgery unless: -> { request.format.json? }

  # GET /samples
  # GET /samples.json
  def index
    @samples = Sample.all
  end

  # GET /samples/1
  # GET /samples/1.json
  def show
    @view_level = params[:view_level] ? params[:view_level].downcase : 'species'
    @pipeline_output = @sample.pipeline_runs.first ? @sample.pipeline_runs.first.pipeline_output : nil
    @job_stats = @pipeline_output ? @pipeline_output.job_stats : nil
    @summary_stats = get_summary_stats(@job_stats)
    @project_info = @sample.project ? @sample.project : nil
    @report_info = {}
    report = @pipeline_output ? @pipeline_output.reports.first : nil
    if report
      external_report_info = external_report_info(report, @view_level, params)
      @report_info[:report_details] = external_report_info[:report_details]
      @report_info[:taxonomy_details] = external_report_info[:taxonomy_details]
      @report_info[:highest_tax_counts] = external_report_info[:highest_tax_counts]
      @report_info[:view_level] = external_report_info[:view_level]
    end
  end

  # GET /samples/new
  def new
    @sample = Sample.new
  end

  # GET /samples/1/edit
  def edit
  end

  # POST /samples
  # POST /samples.json
  def create
    params = sample_params
    if params[:project_name]
      project_name = params.delete(:project_name)
      project = Project.find_by(name: project_name)
    end
    @sample = Sample.new(params)
    @sample.project = project if project
    @sample.input_files.each { |f| f.name ||= File.basename(f.source) }

    respond_to do |format|
      if @sample.save
        format.html { redirect_to @sample, notice: 'Sample was successfully created.' }
        format.json { render :show, status: :created, location: @sample }
      else
        format.html { render :new }
        format.json { render json: @sample.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /samples/1
  # PATCH/PUT /samples/1.json
  def update
    respond_to do |format|
      if @sample.update!(sample_params)
        format.html { redirect_to @sample, notice: 'Sample was successfully updated.' }
        format.json { render :show, status: :ok, location: @sample }
      else
        format.html { render :edit }
        format.json { render json: @sample.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /samples/1
  # DELETE /samples/1.json
  def destroy
    @sample.destroy
    respond_to do |format|
      format.html { redirect_to samples_url, notice: 'Sample was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  # PUT /samples/:id/reupload_source
  def reupload_source
    Resque.enqueue(InitiateS3Cp, @sample.id)
    respond_to do |format|
      format.html { redirect_to samples_url, notice: "Sample is being uploaded if it hasn't been." }
      format.json { head :no_content }
    end
  end

  # PUT /samples/:id/kickoff_pipeline
  def kickoff_pipeline
    @sample.status = Sample::STATUS_RERUN
    @sample.save
    respond_to do |format|
      format.html { redirect_to samples_url, notice: 'A pipeline run is  in progress.' }
      format.json { head :no_content }
    end
  end

  def pipeline_runs
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_sample
    @sample = Sample.find(params[:id])
  end

  # Never trust parameters from the scary internet, only allow the white list through.
  def sample_params
    params.require(:sample).permit(:name, :project_name, :project_id, :status, :s3_preload_result_path,
                                   :s3_star_index_path, :s3_bowtie2_index_path, :host_genome_id,
                                   :sample_memory, :sample_location, :sample_date, :sample_tissue,
                                   :sample_template, :sample_library, :sample_sequencer,
                                   :sample_notes, :job_queue,
                                   input_files_attributes: [:name, :presigned_url, :source_type, :source])
  end
end
