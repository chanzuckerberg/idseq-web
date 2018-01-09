class BackgroundsController < ApplicationController
  include BackgroundsHelper
  before_action :set_background, only: [:show, :edit, :update, :destroy]

  # GET /backgrounds
  # GET /backgrounds.json
  def index
    @backgrounds = Background.all
  end

  # GET /backgrounds/1
  # GET /backgrounds/1.json
  def show
  end

  # GET /backgrounds/new
  def new
    @background = Background.new
  end

  # GET /backgrounds/1/edit
  def edit
  end

  # POST /backgrounds
  # POST /backgrounds.json
  def create
    @background = Background.new(background_params)

    respond_to do |format|
      if @background.save
        format.html { redirect_to @background, notice: 'Background was successfully created.' }
        format.json { render :show, status: :created, location: @background }
      else
        format.html { render :new }
        format.json { render json: @background.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /backgrounds/1
  # PATCH/PUT /backgrounds/1.json
  def update
    current_data = @background.as_json(include: [{ pipeline_runs: { only: [:id, :sample_id] } } ])
    current_data_full_string = @background.to_json(include: [{ pipeline_runs: { only: [:id, :sample_id] } },
                                                             :taxon_summaries])
    background_changed = assign_attributes_and_has_changed?(background_params)
    if background_changed
      s3_archive_successful, s3_backup_path = archive_background_to_s3(current_data_full_string)
      db_archive_successful = archive_background_to_db(current_data, s3_backup_path)
      update_successful = db_archive_successful && s3_archive_successful ? @background.save : false # this triggers recomputation of @background's taxon_summaries if archiving was successful
    else
      update_successful = true
      @background.save # recompute
    end
    respond_to do |format|
      if update_successful
        format.html { redirect_to @background, notice: 'Background was successfully updated.' }
        format.json { render :show, status: :ok, location: @background }
      else
        format.html { render :edit }
        format.json { render json: @background.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /backgrounds/1
  # DELETE /backgrounds/1.json
  def destroy
    @background.destroy
    respond_to do |format|
      format.html { redirect_to backgrounds_url, notice: 'Background was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_background
    @background = Background.find(params[:id])
  end

  # Never trust parameters from the scary internet, only allow the white list through.
  def background_params
    params.require(:background).permit(:name, pipeline_run_ids: [])
  end
end
