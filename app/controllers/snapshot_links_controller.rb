class SnapshotLinksController < ApplicationController
  include SamplesHelper
  include SnapshotSamplesHelper

  NO_EDIT_ACCESS_ERROR = "You are not authorized to edit view-only sharing settings.".freeze

  before_action :app_config_required
  before_action :check_snapshot_exists, only: [:show, :destroy]
  skip_before_action :authenticate_user!, only: [:show]
  before_action only: [:create, :destroy] do
    allowed_feature_required("edit_snapshot_links")
  end

  # GET /pub/:share_id
  def show
    @share_id = snapshot_links_params[:share_id]
    @project_id = @snapshot.project_id
    project = Project.find(@snapshot.project_id)
    @project_name = project.name
    @project_description = project.description
    render template: "home/snapshot"
  end

  # GET /pub/projects/:project_id/info.json
  def info
    project_id = snapshot_links_params[:project_id]
    unless edit_access?(project_id)
      render json: {
        error: NO_EDIT_ACCESS_ERROR,
      }, status: :unauthorized
      return
    end

    snapshot = SnapshotLink.find_by(project_id: project_id)
    samples = current_power.samples.where(project_id: project_id)
    if snapshot.present?
      # timestamp formatted as: "Aug 19, 2020, 1:14pm"
      render json: {
        share_id: snapshot.share_id,
        num_samples: JSON.parse(snapshot.content)["samples"].length,
        pipeline_versions: snapshot_pipeline_versions(snapshot),
        background_id: JSON.parse(snapshot.content)["background_id"] || HostGenome.find_by(name: "Human").default_background_id,
        mass_normalized_backgronds_available: snapshot_enable_mass_normalized_backgrounds(samples),
        timestamp: snapshot.created_at.strftime("%b %d, %Y, %-I:%M%P"),
      }
    else
      render json: {}, status: :not_found
    end
  end

  # POST /pub/projects/:project_id/create
  def create
    project_id = snapshot_links_params[:project_id]
    background_id = snapshot_links_params[:background_id]
    unless edit_access?(project_id)
      render json: {
        error: NO_EDIT_ACCESS_ERROR,
      }, status: :unauthorized
      return
    end

    share_id = SnapshotLink.generate_random_share_id
    content = format_snapshot_content(project_id, background_id)
    snapshot_link = SnapshotLink.new(
      share_id: share_id,
      project_id: project_id,
      creator_id: current_user.id,
      content: content
    )

    snapshot_link.save!
    render json: {}, status: :ok
  rescue StandardError => e
    LogUtil.log_error(
      "Unexpected issue creating snapshot: #{e}",
      exception: e,
      project_id: project_id
    )
    render json: { error: e }, status: :internal_server_error
  end

  # DELETE /pub/:share_id/destroy
  def destroy
    project_id = @snapshot.project_id
    unless edit_access?(project_id)
      render json: {
        error: NO_EDIT_ACCESS_ERROR,
      }, status: :unauthorized
      return
    end

    @snapshot.destroy!
    render json: { head: :no_content }
  rescue StandardError => e
    LogUtil.log_error(
      "Unexpected issue deleting snapshot: #{e}",
      exception: e,
      project_id: project_id
    )
    render json: { error: e }, status: :internal_server_error
  end

  # PUT /pub/:share_id/update_background
  def update_background
    @snapshot = SnapshotLink.find_by(share_id: snapshot_links_params[:share_id])
    project_id = @snapshot.project_id
    if edit_access?(project_id)
      background_id = snapshot_links_params[:background_id]
      content = JSON.parse(@snapshot.content)
      content["background_id"] = background_id
      @snapshot.content = content.to_json
      @snapshot.save
      render json: {
        message: "Snapshot background updated successfully",
        status: :ok,
      }
    else
      render json: {
        error: NO_EDIT_ACCESS_ERROR,
      }, status: :unauthorized
      return
    end
  end

  private

  def block_action
    redirect_to page_not_found_path
  end

  def app_config_required
    unless get_app_config(AppConfig::ENABLE_SNAPSHOT_SHARING) == "1"
      Rails.logger.info("Snapshot sharing AppConfig is not enabled")
      block_action
    end
  end

  def check_snapshot_exists
    @snapshot = SnapshotLink.find_by(share_id: snapshot_links_params[:share_id])
    if @snapshot.blank?
      block_action
    end
  end

  def edit_access?(project_id)
    # Only Project Creator can edit.
    editable_project = current_power.updatable_projects.find_by(id: project_id)
    editable_project&.creator_id == current_user.id
  end

  def format_snapshot_content(project_id, background_id)
    # content stored as
    # {"samples":
    #   [{1: {"pipeline_run_id": 12345}},
    #    {2: {"pipeline_run_id": 12345}}],
    #   "background_id": 1
    # }
    samples = []
    sample_ids = current_power.samples.where(project_id: project_id).pluck(:id)
    if sample_ids.present?
      top_pipeline_run_by_sample_id = top_pipeline_runs_multiget(sample_ids)
      top_pipeline_run_by_sample_id.each do |sample_id, pipeline_run|
        samples << { sample_id.to_s => { "pipeline_run_id" => pipeline_run.id } }
      end
    end
    { "samples" => samples, "background_id" => background_id }.to_json
  end

  def snapshot_links_params
    permitted_params = [:share_id, :project_id, :background_id]
    params.permit(*permitted_params)
  end
end
