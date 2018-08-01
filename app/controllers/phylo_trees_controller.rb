class PhyloTreesController < ApplicationController
  before_action :authenticate_user!
  before_action :login_required
  before_action :set_project, except: :index
  before_action :assert_access, only: :index
  before_action :check_access
  before_action :no_demo_user, only: :create

  def index
    project_id = params[:project_id]
    if project_id
      @project = current_power.projects.find(project_id)
      @phylo_trees = PhyloTree.where(project_id: project_id.to_i)
    else
      @project = []
      @phylo_trees = PhyloTree.where(project_id: current_power.projects.pluck(:id))
    end
  end

  def show
    taxid = params[:taxid].to_i
    tax_level = params[:tax_level]

    project_sample_ids = current_power.project_samples(@project).pluck(:id)
    pipeline_run_ids_with_taxid = TaxonCount.where(tax_id: taxid).where(count_type: 'NT').pluck(:pipeline_run_id)

    @pipeline_runs = PipelineRun.top_completed_runs.where(sample_id: project_sample_ids).where(id: pipeline_run_ids_with_taxid)
    @samples = Sample.where(id: @pipeline_runs.pluck(:sample_id))
    @phylo_tree = @project.phylo_trees.find_by(taxid: taxid)

    taxon_name = @phylo_tree ? @phylo_tree.tax_name : @pipeline_runs.first.taxon_counts.find_by(tax_id: taxid).name
    @taxon = { taxid: taxid, tax_level: tax_level, name: taxon_name }
  end

  def create
    taxid = params[:taxid].to_i
    tax_level = params[:tax_level].to_i
    tax_name = params[:tax_name]
    if @project.phylo_trees.find_by(taxid: taxid).present?
      render json: { message: "a tree run is already in progress for this project and taxon" }
    else
      pipeline_run_ids = params[:pipeline_run_ids].split(",").map(&:to_i)
      pt = PhyloTree.create(taxid: taxid, tax_level: tax_level, tax_name: tax_name, user_id: current_user.id, project_id: @project.id, pipeline_run_ids: pipeline_run_ids)
      Resque.enqueue(KickoffPhyloTree, pt.id)
      render json: { message: "tree creation job submitted" }
    end
  end

  private

  def set_project
    @project = current_power.updatable_projects.find(params[:project_id])
    assert_access
  end
end
