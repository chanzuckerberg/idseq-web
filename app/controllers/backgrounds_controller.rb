class BackgroundsController < ApplicationController
  before_action :login_required, only: [:new, :edit, :update, :destroy, :create]
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
    @background = Background.create(background_params)

    data = @background.summarize.map { |h| h.slice('tax_id', 'count_type', 'tax_level', 'name', :background_id, :created_at, :updated_at, :mean, :stdev) }
    columns = data.first.keys
    values_list = data.map do |hash|
      hash.values.map do |value|
        ActiveRecord::Base.connection.quote(value)
      end
    end
    ActiveRecord::Base.connection.execute <<-SQL
    INSERT INTO taxon_summaries (#{columns.join(",")}) VALUES #{values_list.map { |values| "(#{values.join(",")})" }.join(", ")}
    SQL

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
    respond_to do |format|
      if @background.update(background_params)
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
    params.require(:background).permit(:name, pipeline_output_ids: [], sample_ids: [], reports: [])
  end
end
