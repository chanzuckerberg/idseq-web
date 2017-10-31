class HomeController < ApplicationController
  before_action :login_required
  include SamplesHelper
  def home
    @all_project = Project.all
    project_id = params[:project_id]
    sort = params[:sort_by]
    @project_info = nil

    if params[:ids].present?
      @samples = sort_by(Sample.includes(:pipeline_runs, :pipeline_outputs).where("id in (#{params[:ids]})").paginate(page: params[:page]), sort)
      @samples_count = @samples.size
    elsif project_id.present?
      @samples = sort_by(Sample.includes(:pipeline_runs, :pipeline_outputs).where(project_id: project_id).paginate(page: params[:page]), sort)
      @project_info = Project.find(project_id)
      @samples_count = Sample.where(project_id: project_id).size
    else
      @samples = sort_by(Sample.includes(:pipeline_runs, :pipeline_outputs).paginate(page: params[:page]), sort)
      @samples_count = Sample.all.size
    end
    @final_result = samples_info(@samples) ? samples_info(@samples)[:final_result] : nil
    @pipeline_run_info = samples_info(@samples) ? samples_info(@samples)[:pipeline_run_info] : nil
  end

  def search
    project_id = params[:project_id]
    search_query = params[:search]

    if project_id
      @samples = Sample.includes(:pipeline_runs, :pipeline_outputs).search(search_query).where(project_id: project_id).paginate(page: params[:page])
    else
      @samples = Sample.includes(:pipeline_runs, :pipeline_outputs).search(search_query).paginate(page: params[:page])
    end
    @final_result = samples_info(@samples)[:final_result]
    @pipeline_run_info = samples_info(@samples)[:pipeline_run_info]
    if @samples.length
      respond_to do |format|
        format.json { render json: {samples: @samples, final_result: @final_result, pipeline_run_info: @pipeline_run_info}, message: 'Search results found' }
      end
    else
      respond_to do |format|
        format.json { render message: 'No Search results found' }
      end
    end
  end

  def sort_by(samples, dir = nil)
    default_dir = 'newest'
    dir ||= default_dir
    dir == 'newest' ? samples.order(created_at: :desc) : samples.order(created_at: :asc)
  end
end
