class SamplesController < ApplicationController
  include ApplicationHelper
  include ReportHelper
  include SamplesHelper
  include PipelineOutputsHelper
  include ElasticsearchHelper
  include HeatmapHelper
  include ErrorHelper

  ########################################
  # Note to developers:
  # If you are adding a new action to the sample controller, you must classify your action into
  # READ_ACTIONS: where current_user has read access of the sample
  # EDIT_ACTIONS: where current_user has update access of the sample
  # OTHER_ACTIONS: where the actions access multiple samples or non-existing samples.
  #                access control should still be checked as neccessary through current_power
  #
  ##########################################
  skip_before_action :verify_authenticity_token, only: [:create, :update, :bulk_upload_with_metadata]

  # Read action meant for single samples with set_sample before_action
  READ_ACTIONS = [:show, :report_info, :report_csv, :assembly, :show_taxid_fasta, :nonhost_fasta, :unidentified_fasta,
                  :contigs_fasta, :contigs_summary, :results_folder, :show_taxid_alignment, :show_taxid_alignment_viz, :metadata,
                  :contig_taxid_list, :taxid_contigs, :summary_contig_counts].freeze
  EDIT_ACTIONS = [:edit, :update, :destroy, :reupload_source, :resync_prod_data_to_staging, :kickoff_pipeline, :retry_pipeline,
                  :pipeline_runs, :save_metadata, :save_metadata_v2, :raw_results_folder, :upload_heartbeat].freeze

  OTHER_ACTIONS = [:create, :bulk_new, :bulk_upload, :bulk_upload_with_metadata, :bulk_import, :new, :index, :index_v2, :details, :dimensions, :all,
                   :show_sample_names, :cli_user_instructions, :metadata_fields, :samples_going_public,
                   :search_suggestions, :upload, :validate_sample_files].freeze

  before_action :authenticate_user!, except: [:create, :update, :bulk_upload, :bulk_upload_with_metadata]
  acts_as_token_authentication_handler_for User, only: [:create, :update, :bulk_upload, :bulk_upload_with_metadata], fallback: :devise

  before_action :admin_required, only: [:reupload_source, :resync_prod_data_to_staging, :kickoff_pipeline, :retry_pipeline, :pipeline_runs]
  before_action :no_demo_user, only: [:create, :bulk_new, :bulk_upload, :bulk_import, :new]

  current_power do # Put this here for CLI
    Power.new(current_user)
  end
  # Read actions are mapped to viewable_samples scope and Edit actions are mapped to updatable_samples.
  power :samples, map: { EDIT_ACTIONS => :updatable_samples }, as: :samples_scope

  before_action :set_sample, only: READ_ACTIONS + EDIT_ACTIONS
  before_action :assert_access, only: OTHER_ACTIONS # Actions which don't require access control check
  before_action :check_access

  PAGE_SIZE = 30
  DEFAULT_MAX_NUM_TAXONS = 30
  MAX_PAGE_SIZE_V2 = 100

  # GET /samples
  # GET /samples.json
  def index
    # this endpoint will be replaced in the future by index_v2
    @all_project = current_power.projects
    @page_size = PAGE_SIZE
    project_id = params[:project_id]
    name_search_query = params[:search]
    filter_query = params[:filter]
    page = params[:page]
    tissue_type_query = params[:tissue].split(',') if params[:tissue].present?
    host_query = params[:host].split(',') if params[:host].present?
    samples_query = params[:ids].split(',') if params[:ids].present?
    sort = params[:sort_by]
    # Return only some basic props for samples.
    basic_only = ActiveModel::Type::Boolean.new.cast(params[:basic_only])

    results = current_power.samples

    results = results.where(id: samples_query) if samples_query.present?
    results = results.where(project_id: project_id) if project_id.present?
    results = results.where(user_id: params[:uploader].split(",")) if params[:uploader].present?
    results = filter_by_taxid(results, params[:taxid].split(",")) if params[:taxid].present?

    @count_project = results.size

    # Get tissue types and host genomes that are present in the sample list
    # TODO(yf) : the following tissue_types, host_genomes have performance
    # impact that it should be moved to different dedicated functions. Not
    # parsing the whole results.
    @tissue_types = get_distinct_sample_types(results)

    host_genome_ids = results.select("distinct(host_genome_id)").map(&:host_genome_id).compact.sort
    @host_genomes = HostGenome.find(host_genome_ids)

    # Query by name for a Sample attribute or pathogen name in the Sample.
    if name_search_query.present?
      # Pass in a scope of pipeline runs using current_power
      pipeline_run_ids = current_power.pipeline_runs.top_completed_runs.pluck(:id)
      results = results.search(name_search_query, pipeline_run_ids)
    end

    results = filter_by_status(results, filter_query) if filter_query.present?
    results = filter_by_metadatum(results, "sample_type", tissue_type_query) if tissue_type_query.present?
    results = filter_by_metadatum(results, "collection_location", params[:location].split(',')) if params[:location].present?
    results = filter_by_host(results, host_query) if host_query.present?

    @samples = sort_by(results, sort).paginate(page: page, per_page: params[:per_page] || PAGE_SIZE).includes([:user, :host_genome, :pipeline_runs, :input_files])
    @samples_count = results.size
    @samples_formatted = basic_only ? format_samples_basic(@samples) : format_samples(@samples)

    @ready_sample_ids = get_ready_sample_ids(results)

    if basic_only
      render json: @samples_formatted
    # Send more information with the first page.
    elsif !page || page == '1'
      render json: {
        # Samples in this page.
        samples: @samples_formatted,
        # Number of samples in the current query.
        count: @samples_count,
        tissue_types: @tissue_types,
        host_genomes: @host_genomes,
        # Total number of samples in the project
        count_project: @count_project,
        # Ids for all ready samples in the current query, not just the current page.
        ready_sample_ids: @ready_sample_ids
      }
    else
      render json: {
        samples: @samples_formatted
      }
    end
  end

  def index_v2
    # this method is going to replace 'index' once we fully migrate to the
    # discovery views (old one was kept to avoid breaking the current inteface
    # without sacrificing speed of development and avoid breaking the current interface)
    domain = params[:domain]
    order_by = params[:orderBy] || :id
    order_dir = params[:orderDir] || :desc
    limit = params[:limit] ? params[:limit].to_i : MAX_PAGE_SIZE_V2
    offset = params[:offset].to_i

    list_all_sample_ids = ActiveModel::Type::Boolean.new.cast(params[:listAllIds])

    samples = samples_by_domain(domain)
    samples = filter_samples(samples, params)

    samples = samples.order(Hash[order_by => order_dir])
    limited_samples = samples.offset(offset).limit(limit)

    limited_samples_json = limited_samples.as_json(
      only: [:id, :name, :sample_tissue, :host_genome_id, :project_id, :created_at, :public],
      methods: []
    )
    samples_visibility = visibility(limited_samples)

    # format_samples loads a lot of information about samples
    # There many ways we can refactor: multiple endoints for client to ask for the informaion
    # they actually need or at least a configurable function to get only certain data
    details_json = format_samples(limited_samples).as_json()
    limited_samples_json.zip(details_json, samples_visibility).map do |sample, details, visibility|
      sample[:public] = visibility
      sample[:details] = details
    end

    results = { samples: limited_samples_json }
    results[:all_samples_ids] = samples.pluck(:id) if list_all_sample_ids

    # Refactor once we have a clear API definition policy
    respond_to do |format|
      format.json do
        # TODO(tiago): a lot of the values return by format_sample do not make sense on a sample controller
        render json: results
      end
    end
  end

  def dimensions
    # TODO(tiago): consider split into specific controllers / models
    domain = params[:domain]
    param_sample_ids = (params[:sampleIds] || []).map(&:to_i)

    # Access control enforced within samples_by_domain
    samples = samples_by_domain(domain)

    unless param_sample_ids.empty?
      samples = samples.where(id: param_sample_ids)
    end
    sample_ids = samples.pluck(:id)

    samples = filter_samples(samples, params)

    locations = samples_by_metadata_field(sample_ids, "collection_location").count
    locations = locations.map do |location, count|
      { value: location, text: location, count: count }
    end

    tissues = samples_by_metadata_field(sample_ids, "sample_type").count
    tissues = tissues.map do |tissue, count|
      { value: tissue, text: tissue, count: count }
    end

    # visibility
    public_count = samples.public_samples.count
    private_count = samples.count - public_count
    visibility = [
      { value: "public", text: "Public", count: public_count },
      { value: "private", text: "Private", count: private_count }
    ]

    times = [
      { value: "1_week", text: "Last Week", count: samples.where("samples.created_at >= ?", 1.week.ago.utc).count },
      { value: "1_month", text: "Last Month", count: samples.where("samples.created_at >= ?", 1.month.ago.utc).count },
      { value: "3_month", text: "Last 3 Months", count: samples.where("samples.created_at >= ?", 3.months.ago.utc).count },
      { value: "6_month", text: "Last 6 Months", count: samples.where("samples.created_at >= ?", 6.months.ago.utc).count },
      { value: "1_year", text: "Last Year", count: samples.where("samples.created_at >= ?", 1.year.ago.utc).count }
    ]

    hosts = samples.joins(:host_genome).group(:host_genome).count
    hosts = hosts.map do |host, count|
      { value: host.id, text: host.name, count: count }
    end

    respond_to do |format|
      format.json do
        render json: [
          { dimension: "location", values: locations },
          { dimension: "visibility", values: visibility },
          { dimension: "time", values: times },
          { dimension: "host", values: hosts },
          { dimension: "tissue", values: tissues }
        ]
      end
    end
  end

  def all
    @samples = if params[:ids].present?
                 current_power.samples.where(["id in (?)", params[:ids].to_s])
               else
                 current_power.samples
               end
  end

  def search_suggestions
    query = params[:query]
    # TODO: consider moving into a search_controller or into separate controllers/models
    categories = params[:categories]

    # Generate structure required by CategorySearchBox
    # Not permission-dependent
    results = {}
    if !categories || categories.include?("taxon")
      taxon_list = taxon_search(query, ["species", "genus"])
      unless taxon_list.empty?
        results["Taxon"] = {
          "name" => "Taxon",
          "results" => taxon_list.map do |entry|
            entry.merge("category" => "Taxon")
          end
        }
      end
    end
    if !categories || categories.include?("host")
      hosts = HostGenome.where("name LIKE :search", search: "#{query}%")
      unless hosts.empty?
        results["Host"] = {
          "name" => "Host",
          "results" => hosts.map do |h|
            { "category" => "Host", "title" => h.name, "id" => h.id }
          end
        }
      end
    end

    # Need users
    if !categories || ["project", "sample", "location", "tissue", "uploader"].any? { |i| categories.include? i }
      # Admin-only for now: needs permissions scoping
      users = current_user.admin ? prefix_match(User, "name", query, {}) : []
    end

    if !categories || categories.include?("project")
      projects = prefix_match(Project, "name", query, id: current_power.projects.pluck(:id))
      unless projects.empty?
        results["Project"] = {
          "name" => "Project",
          "results" => projects.index_by(&:name).map do |_, p|
            { "category" => "Project", "title" => p.name, "id" => p.id }
          end
        }
      end
    end
    if !categories || categories.include?("uploader")
      unless users.empty?
        results["Uploader"] = {
          "name" => "Uploader",
          "results" => users.group_by(&:name).map do |val, records|
            { "category" => "Uploader", "title" => val, "id" => records.pluck(:id) }
          end
        }
      end
    end

    # Permission-dependent
    if !categories || ["sample", "location", "tissue"].any? { |i| categories.include? i }
      viewable_sample_ids = current_power.samples.pluck(:id)
    end

    if !categories || categories.include?("sample")
      samples = prefix_match(Sample, "name", query, id: viewable_sample_ids)
      unless samples.empty?
        results["Sample"] = {
          "name" => "Sample",
          "results" => samples.group_by(&:name).map do |val, records|
            { "category" => "Sample", "title" => val, "id" => val, "sample_ids" => records.pluck(:id), "project_id" => records.count == 1 ? records.first.project_id : nil }
          end
        }
      end
    end
    if !categories || categories.include?("location")
      locations = prefix_match(Metadatum, "string_validated_value", query, sample_id: viewable_sample_ids).where(key: "collection_location")
      unless locations.empty?
        results["Location"] = {
          "name" => "Location",
          "results" => locations.pluck(:string_validated_value).uniq.map do |val|
                         { "category" => "Location", "title" => val, "id" => val }
                       end
        }
      end
    end
    if !categories || categories.include?("tissue")
      tissues = prefix_match(Metadatum, "string_validated_value", query, sample_id: viewable_sample_ids).where(key: "sample_type")
      unless tissues.empty?
        results["Tissue"] = {
          "name" => "Tissue",
          "results" => tissues.pluck(:string_validated_value).uniq.map do |val|
            { "category" => "Tissue", "title" => val, "id" => val }
          end
        }
      end
    end

    render json: JSON.dump(results)
  end

  # GET /samples/bulk_new
  # TODO(mark): Remove once we launch the new sample upload flow.
  def bulk_new
    @projects = current_power.updatable_projects
    @host_genomes = host_genomes_list ? host_genomes_list : nil
  end

  def bulk_import
    @project_id = params[:project_id]
    @project = Project.find(@project_id)
    unless current_power.updatable_project?(@project)
      render json: { status: "user is not authorized to update to project #{@project.name}" }, status: :unprocessable_entity
      return
    end

    unless current_user.can_upload(params[:bulk_path])
      render json: { status: "user is not authorized to upload from s3 url #{params[:bulk_path]}" }, status: :unprocessable_entity
      return
    end

    @host_genome_id = params[:host_genome_id]
    @bulk_path = params[:bulk_path]
    @samples = parsed_samples_for_s3_path(@bulk_path, @project_id, @host_genome_id)
    respond_to do |format|
      format.json do
        if @samples.present?
          render json: { samples: @samples }
        else
          render json: { status: "No samples imported under #{@bulk_path}. Files must have extension fastq.gz/fq.gz/fastq/fq/fasta.gz/fa.gz/fasta/fa." }, status: :unprocessable_entity
        end
      end
    end
  end

  # POST /samples/bulk_upload
  # Currently only used for web S3 uploads
  # TODO(mark): Remove once we launch the new sample upload flow.
  def bulk_upload
    samples = samples_params || []
    editable_project_ids = current_power.updatable_projects.pluck(:id)
    @samples = []
    @errors = []
    samples.each do |sample_attributes|
      sample = Sample.new(sample_attributes)
      next unless editable_project_ids.include?(sample.project_id)
      sample.bulk_mode = true
      sample.user = current_user
      if sample.save
        @samples << sample
      else
        @errors << sample.errors
      end
    end

    respond_to do |format|
      if @errors.empty? && !@samples.empty?
        # Send to Datadog and Segment
        tags = %W[client:web type:bulk user_id:#{current_user.id}]
        MetricUtil.put_metric_now("samples.created", @samples.count, tags)
        MetricUtil.log_upload_batch_analytics(@samples, current_user, "web")
        format.json { render json: { samples: @samples, sample_ids: @samples.pluck(:id) } }
      else
        format.json { render json: { samples: @samples, errors: @errors }, status: :unprocessable_entity }
      end
    end
  end

  # POST /samples/bulk_upload_with_metadata
  def bulk_upload_with_metadata
    samples_to_upload = samples_params || []
    metadata = params[:metadata] || {}
    client = params[:client]
    errors = []

    # Check if the client is up-to-date. "web" is always valid whereas the
    # CLI client should provide a version string to-be-checked against the
    # minimum version here. Bulk upload from CLI goes to this method.
    min_version = Gem::Version.new('0.5.0')
    unless client && (client == "web" || Gem::Version.new(client) >= min_version)
      render json: {
        message: "Outdated command line client. Please run `pip install --upgrade git+https://github.com/chanzuckerberg/idseq-cli.git ` or with sudo + pip2/pip3 depending on your setup.",
        status: :upgrade_required
      }
      return
    end

    editable_project_ids = current_power.updatable_projects.pluck(:id)

    samples_to_upload, samples_invalid_projects = samples_to_upload.partition { |sample| editable_project_ids.include?(Integer(sample["project_id"])) }

    # For invalid projects, don't attempt to upload metadata.
    samples_invalid_projects.each do |sample|
      metadata.delete(sample["name"])
      errors << SampleUploadErrors.invalid_project_id(sample)
    end

    upload_errors, samples = upload_samples_with_metadata(samples_to_upload, metadata).values_at("errors", "samples")

    errors.concat(upload_errors)

    # After creation, if a sample is missing required metadata, destroy it.
    # TODO(mark): Move this logic into a validator in the model in the future.
    # Hard to do right now because this isn't launched yet, and also many existing samples don't have required metadata.
    removed_samples = []
    samples.includes(host_genome: [:metadata_fields], project: [:metadata_fields], metadata: [:metadata_field]).each do |sample|
      missing_required_metadata_fields = sample.missing_required_metadata_fields
      unless missing_required_metadata_fields.empty?
        errors << SampleUploadErrors.missing_required_metadata(sample, missing_required_metadata_fields.pluck(:name))
        sample.destroy
        removed_samples << sample
      end
    end
    samples -= removed_samples

    respond_to do |format|
      if samples.count > 0
        tags = %W[client:web type:bulk user_id:#{current_user.id}]
        MetricUtil.put_metric_now("samples.created", samples.count, tags)
      end
      format.json { render json: { samples: samples, sample_ids: samples.pluck(:id), errors: errors } }
    end
  end

  # GET /samples/1/report_csv
  def report_csv
    @report_csv = report_csv_from_params(@sample, params)
    send_data @report_csv, filename: @sample.name + '_report.csv'
  end

  # GET /samples/1/metadata
  # GET /samples/1/metadata.json
  def metadata
    # Information needed to show the samples metadata sidebar.
    pr = select_pipeline_run(@sample, params)
    summary_stats = nil
    pr_display = nil
    ercc_comparison = nil

    editable = current_power.updatable_sample?(@sample)

    if pr
      pr_display = curate_pipeline_run_display(pr)
      ercc_comparison = pr.compare_ercc_counts

      job_stats_hash = job_stats_get(pr.id)
      if job_stats_hash.present?
        summary_stats = get_summary_stats(job_stats_hash, pr)
      end
    end

    render json: {
      # Pass down base_type for the frontend
      metadata: @sample.metadata_with_base_type,
      additional_info: {
        name: @sample.name,
        editable: editable,
        host_genome_name: @sample.host_genome_name,
        upload_date: @sample.created_at,
        project_name: @sample.project.name,
        project_id: @sample.project_id,
        notes: @sample.sample_notes,
        ercc_comparison: ercc_comparison,
        pipeline_run: pr_display,
        summary_stats: summary_stats
      }
    }
  end

  # Get MetadataFields for the array of sampleIds (could be 1)
  def metadata_fields
    sample_ids = (params[:sampleIds] || []).map(&:to_i)

    if sample_ids.length == 1
      @sample = current_power.viewable_samples.find(sample_ids[0])
      results = @sample.metadata_fields_info
    else
      # Get the MetadataFields that are on the Samples' Projects and HostGenomes
      samples = current_power.viewable_samples.where(id: sample_ids)
      project_ids = samples.distinct.pluck(:project_id)
      host_genome_ids = samples.distinct.pluck(:host_genome_id)

      project_fields = Project.where(id: project_ids).includes(metadata_fields: [:host_genomes]).map(&:metadata_fields)
      host_genome_fields = HostGenome.where(id: host_genome_ids).includes(metadata_fields: [:host_genomes]).map(&:metadata_fields)
      results = (project_fields.flatten & host_genome_fields.flatten).map(&:field_info)
    end

    render json: results
  end

  # POST /samples/1/save_metadata_v2
  def save_metadata_v2
    saved = @sample.metadatum_add_or_update(params[:field], params[:value])
    if saved
      render json: {
        status: "success",
        message: "Saved successfully"
      }
    else
      error_messages = @sample ? @sample.errors.full_messages : []
      render json: {
        status: 'failed',
        message: 'Unable to update sample',
        errors: error_messages
      }
    end
  end

  # GET /samples/1
  # GET /samples/1.json
  def show
    @pipeline_run = select_pipeline_run(@sample, params)
    @amr_counts = nil
    can_see_amr = (current_user.admin? || current_user.allowed_feature_list.include?("AMR"))
    if can_see_amr && @pipeline_run
      amr_state = @pipeline_run.output_states.find_by(output: "amr_counts")
      if amr_state.present? && amr_state.state == PipelineRun::STATUS_LOADED
        @amr_counts = @pipeline_run.amr_counts
      end
    end
    @pipeline_version = @pipeline_run.pipeline_version || PipelineRun::PIPELINE_VERSION_WHEN_NULL if @pipeline_run
    @pipeline_versions = @sample.pipeline_versions

    @pipeline_run_display = curate_pipeline_run_display(@pipeline_run)
    @sample_status = @pipeline_run ? @pipeline_run.job_status_display : 'Waiting to Start or Receive Files'
    pipeline_run_id = @pipeline_run ? @pipeline_run.id : nil
    job_stats_hash = job_stats_get(pipeline_run_id)
    @summary_stats = job_stats_hash.present? ? get_summary_stats(job_stats_hash, @pipeline_run) : nil
    @project_info = @sample.project ? @sample.project : nil
    @project_sample_ids_names = @sample.project ? Hash[current_power.project_samples(@sample.project).map { |s| [s.id, s.name] }] : nil
    @host_genome = @sample.host_genome ? @sample.host_genome : nil
    @background_models = current_power.backgrounds.where(ready: 1)
    @can_edit = current_power.updatable_sample?(@sample)
    @git_version = ENV['GIT_VERSION'] || ""
    @git_version = Time.current.to_i if @git_version.blank?

    @align_viz = false
    align_summary_file = @pipeline_run ? "#{@pipeline_run.alignment_viz_output_s3_path}.summary" : nil
    @align_viz = true if align_summary_file && get_s3_file(align_summary_file)

    background_id = get_background_id(@sample)
    @report_page_params = { pipeline_version: @pipeline_version, background_id: background_id } if background_id
    @report_page_params[:scoring_model] = params[:scoring_model] if params[:scoring_model]

    # Check if the report table should actually show
    if background_id && @pipeline_run && @pipeline_run.report_ready?
      @report_present = true
      @report_ts = @pipeline_run.updated_at.to_i
      @all_categories = all_categories
      @report_details = report_details(@pipeline_run, current_user.id)
      @ercc_comparison = @pipeline_run.compare_ercc_counts
    end

    viz = last_saved_visualization
    @saved_param_values = viz ? viz.data : {}

    tags = %W[sample_id:#{@sample.id} user_id:#{current_user.id}]
    MetricUtil.put_metric_now("samples.showed", 1, tags)
  end

  def last_saved_visualization
    valid_viz_types = ['tree', 'table'] # See PipelineSampleReport.jsx
    Sample
      .includes(:visualizations)
      .find(@sample.id)
      .visualizations
      .where(user: current_user)
      .where('visualizations.visualization_type IN (?)', valid_viz_types)
      .order('visualizations.updated_at desc')
      .limit(1)[0]
  end

  def samples_going_public
    ahead = (params[:ahead] || 10).to_i
    behind = params[:behind].to_i

    start = Time.current - behind.days
    samples = current_power.samples.samples_going_public_in_period(
      [start, start + ahead.days],
      params[:userId] ? User.find(params[:userId]) : current_user,
      params[:projectId] ? Project.find(params[:projectId]) : nil
    )
    render json: samples.to_json(include: [{ project: { only: [:id, :name] } }])
  end

  def report_info
    expires_in 30.days
    @pipeline_run = select_pipeline_run(@sample, params)

    ##################################################
    ## Duct tape for changing background id dynamically
    ## TODO(yf): clean the following up.
    ####################################################
    if @pipeline_run && (((@pipeline_run.adjusted_remaining_reads.to_i > 0 || @pipeline_run.finalized?) && !@pipeline_run.failed?) || @pipeline_run.report_ready?)
      background_id = get_background_id(@sample)
      pipeline_run_id = @pipeline_run.id
    end

    @report_info = external_report_info(pipeline_run_id, background_id, params)

    # Fill lineage details into report info.
    # @report_info[:taxonomy_details][2] is the array of taxon rows (which are hashes with keys like tax_id, name, NT, etc)
    @report_info[:taxonomy_details][2] = TaxonLineage.fill_lineage_details(@report_info[:taxonomy_details][2], pipeline_run_id)

    # Label top-scoring hits for the executive summary
    @report_info[:topScoringTaxa] = label_top_scoring_taxa!(@report_info[:taxonomy_details][2])
    @report_info[:contig_taxid_list] = @pipeline_run.get_taxid_list_with_contigs

    render json: JSON.dump(@report_info)
  end

  def save_metadata
    field = params[:field].to_sym
    value = params[:value]
    metadata = { field => value }
    metadata.select! { |k, _v| (Sample::METADATA_FIELDS + [:name]).include?(k) }
    if @sample[field].blank? && value.strip.blank?
      render json: {
        status: "ignored"
      }
    else
      @sample.update_attributes!(metadata)
      render json: {
        status: "success",
        message: "Saved successfully"
      }
    end
  rescue
    error_messages = @sample ? @sample.errors.full_messages : []
    render json: {
      status: 'failed',
      message: 'Unable to update sample',
      errors: error_messages
    }
  end

  def contig_taxid_list
    pr = select_pipeline_run(@sample, params)
    render json: pr.get_taxid_list_with_contigs
  end

  def taxid_contigs
    taxid = params[:taxid]
    return if HUMAN_TAX_IDS.include? taxid.to_i
    pr = select_pipeline_run(@sample, params)
    contigs = pr.get_contigs_for_taxid(taxid.to_i)
    output_fasta = ''
    contigs.each { |contig| output_fasta += contig.to_fa }
    send_data output_fasta, filename: "#{@sample.name}_tax_#{taxid}_contigs.fasta"
  end

  def summary_contig_counts
    pr = select_pipeline_run(@sample, params)
    min_contig_size = params[:min_contig_size] || PipelineRun::MIN_CONTIG_SIZE
    contig_counts = pr.get_summary_contig_counts(min_contig_size)
    render json: { min_contig_size: min_contig_size, contig_counts: contig_counts }
  end

  def show_taxid_fasta
    return if HUMAN_TAX_IDS.include? params[:taxid].to_i
    pr = select_pipeline_run(@sample, params)
    if params[:hit_type] == "NT_or_NR"
      nt_array = get_taxid_fasta_from_pipeline_run(pr, params[:taxid], params[:tax_level].to_i, 'NT').split(">")
      nr_array = get_taxid_fasta_from_pipeline_run(pr, params[:taxid], params[:tax_level].to_i, 'NR').split(">")
      @taxid_fasta = ">" + ((nt_array | nr_array) - ['']).join(">")
      @taxid_fasta = "Coming soon" if @taxid_fasta == ">" # Temporary fix
    else
      @taxid_fasta = get_taxid_fasta_from_pipeline_run(pr, params[:taxid], params[:tax_level].to_i, params[:hit_type])
    end
    send_data @taxid_fasta, filename: @sample.name + '_' + clean_taxid_name(pr, params[:taxid]) + '-hits.fasta'
  end

  def show_taxid_alignment_viz
    @taxon_info = params[:taxon_info].split(".")[0]
    @taxid = @taxon_info.split("_")[2].to_i
    if HUMAN_TAX_IDS.include? @taxid.to_i
      render json: { status: :forbidden, message: "Human taxon ids are not allowed" }
      return
    end

    pr = select_pipeline_run(@sample, params)

    @tax_level = @taxon_info.split("_")[1]
    @taxon_name = taxon_name(@taxid, @tax_level)
    @pipeline_version = pr.pipeline_version if pr

    respond_to do |format|
      format.json do
        s3_file_path = pr.alignment_viz_json_s3(@taxon_info.tr('_', '.'))
        (_tmp1, _tmp2, bucket, key) = s3_file_path.split('/', 4)
        begin
          resp = Client.head_object(bucket: bucket, key: key)
          if resp.content_length < 10_000_000
            alignment_data = JSON.parse(get_s3_file(s3_file_path) || "{}")
            flattened_data = {}
            parse_tree(flattened_data, @taxid, alignment_data, true)
            output_array = []
            flattened_data.each do |k, v|
              v["accession"] = k
              v["reads_count"] = v["reads"].size
              output_array << v
            end
            render json: output_array.sort { |a, b| b['reads_count'] <=> a['reads_count'] }
          else
            render json: {
              error: "alignment file too big"
            }
          end
        rescue
          render json: {
            error: "unexpected error occurred"
          }
        end
      end
      format.html {}
    end
  end

  def contigs_fasta
    pr = select_pipeline_run(@sample, params)
    contigs_fasta_s3_path = pr.contigs_fasta_s3_path

    if contigs_fasta_s3_path
      @contigs_fasta = get_s3_file(contigs_fasta_s3_path)
      send_data @contigs_fasta, filename: @sample.name + '_contigs.fasta'
    else
      render json: {
        error: "contigs fasta file does not exist for this sample"
      }
    end
  end

  def contigs_summary
    pr = select_pipeline_run(@sample, params)
    local_file = pr.generate_contig_mapping_table

    @contigs_summary = File.read(local_file)
    send_data @contigs_summary, filename: @sample.name + '_contigs_summary.csv'
  end

  def nonhost_fasta
    pr = select_pipeline_run(@sample, params)
    @nonhost_fasta = get_s3_file(pr.annotated_fasta_s3_path)
    send_data @nonhost_fasta, filename: @sample.name + '_nonhost.fasta'
  end

  def unidentified_fasta
    pr = select_pipeline_run(@sample, params)
    @unidentified_fasta = get_s3_file(pr.unidentified_fasta_s3_path)
    send_data @unidentified_fasta, filename: @sample.name + '_unidentified.fasta'
  end

  def raw_results_folder
    @file_list = @sample.results_folder_files
    @file_path = "#{@sample.sample_path}/results/"
    render template: "samples/raw_folder"
  end

  def results_folder
    can_edit = current_power.updatable_samples.include?(@sample)
    @exposed_raw_results_url = can_edit ? raw_results_folder_sample_url(@sample) : nil
    can_see_stage1_results = can_edit
    @file_list = @sample.pipeline_runs.first.outputs_by_step(can_see_stage1_results)
    @file_path = "#{@sample.sample_path}/results/"
    respond_to do |format|
      format.html do
        render template: "samples/folder"
      end
      format.json do
        render json: { displayed_data: @file_list }
      end
    end
  end

  def validate_sample_files
    sample_files = params[:sample_files]

    files_valid = []

    if sample_files
      files_valid = sample_files.map do |file|
        !InputFile::FILE_REGEX.match(file).nil?
      end
    end

    render json: files_valid
  end

  # GET /samples/new
  # TODO(mark): Remove once we launch the new sample upload flow.
  def new
    @sample = nil
    @projects = current_power.updatable_projects
    @host_genomes = host_genomes_list || nil
  end

  # GET /samples/upload
  def upload
    @projects = current_power.updatable_projects
    @host_genomes = host_genomes_list || nil
  end

  # GET /samples/1/edit
  def edit
    @project_info = @sample.project ? @sample.project : nil
    @host_genomes = host_genomes_list ? host_genomes_list : nil
    @projects = current_power.updatable_projects
    @input_files = @sample.input_files
  end

  # POST /samples
  # POST /samples.json
  # TODO(mark): Remove once we launch the new sample upload flow.
  def create
    # Single sample upload path
    params = sample_params

    # Check if the client is up-to-date. "web" is always valid whereas the
    # CLI client should provide a version string to-be-checked against the
    # minimum version here. Bulk upload from CLI goes to this method.
    client = params.delete(:client)
    min_version = Gem::Version.new('0.5.0')
    unless client && (client == "web" || Gem::Version.new(client) >= min_version)
      render json: {
        message: "Outdated command line client. Please run `pip install --upgrade git+https://github.com/chanzuckerberg/idseq-cli.git ` or with sudo + pip2/pip3 depending on your setup.",
        status: :upgrade_required
      }
      return
    end

    if params[:project_name]
      project_name = params.delete(:project_name)
      project = Project.find_by(name: project_name)
      unless project
        project = Project.create(name: project_name)
        project.users << current_user if current_user
      end
    end
    if project && !current_power.updatable_project?(project)
      respond_to do |format|
        format.json { render json: { status: "User not authorized to update project #{project.name}" }, status: :unprocessable_entity }
        format.html { render json: { status: "User not authorized to update project #{project.name}" }, status: :unprocessable_entity }
      end
      return
    end
    if params[:host_genome_name]
      host_genome_name = params.delete(:host_genome_name)
      host_genome = HostGenome.find_by(name: host_genome_name)
    end

    params[:input_files_attributes].reject! { |f| f["source"] == '' }
    params[:alignment_config_name] = AlignmentConfig::DEFAULT_NAME if params[:alignment_config_name].blank?

    @sample = Sample.new(params)
    @sample.project = project if project
    @sample.input_files.each { |f| f.name ||= File.basename(f.source) }
    @sample.user = current_user
    @sample.host_genome ||= (host_genome || HostGenome.first)

    respond_to do |format|
      if @sample.save
        tags = %W[sample_id:#{@sample.id} user_id:#{current_user.id} client:#{client}]
        # Currently bulk CLI upload just calls this action repeatedly so we can't
        # distinguish between bulk or single there. Web bulk goes to bulk_upload.
        tags << "type:single" if client == "web"
        # Send to Datadog and Segment
        MetricUtil.put_metric_now("samples.created", 1, tags)
        MetricUtil.log_upload_batch_analytics([@sample], current_user, client)

        format.html { redirect_to @sample, notice: 'Sample was successfully created.' }
        format.json { render :show, status: :created, location: @sample }
      else
        format.html { render :new }
        format.json do
          render json: { sample_errors: @sample.errors.full_messages,
                         project_errors: project ? project.errors.full_messages : nil },
                 status: :unprocessable_entity
        end
      end
    end
  end

  # PATCH/PUT /samples/1
  # PATCH/PUT /samples/1.json
  def update
    respond_to do |format|
      if @sample.update(sample_params)
        format.html { redirect_to @sample, notice: 'Sample was successfully updated.' }
        format.json { render :show, status: :ok, location: @sample }
      else
        format.html { render :edit }
        format.json { render json: @sample.errors.full_messages, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /samples/1
  # DELETE /samples/1.json
  def destroy
    # Will also delete from job_stats, ercc_counts, backgrounds_pipeline_runs, pipeline_runs, input_files, and backgrounds_samples
    deletable = @sample.deletable?(current_user)
    success = false
    success = @sample.destroy if deletable
    respond_to do |format|
      if success
        format.html { redirect_to samples_url, notice: 'Sample was successfully destroyed.' }
        format.json { head :no_content }
      else
        format.html { render :edit }
        format.json { render json: { message: 'Cannot delete this sample. Something went wrong.' }, status: :unprocessable_entity }
      end
    end
  end

  # PUT /samples/:id/reupload_source
  def reupload_source
    Resque.enqueue(InitiateS3Cp, @sample.id)
    respond_to do |format|
      format.html { redirect_to @sample, notice: "Sample is being uploaded if it hasn't been." }
      format.json { head :no_content }
    end
  end

  # PUT /samples/:id/resync_prod_data_to_staging
  def resync_prod_data_to_staging
    if Rails.env == 'staging'
      pr_ids = @sample.pipeline_run_ids.join(",")
      unless pr_ids.empty?
        ['taxon_counts', 'taxon_byteranges', 'contigs'].each do |table_name|
          ActiveRecord::Base.connection.execute("REPLACE INTO idseq_staging.#{table_name} SELECT * FROM idseq_prod.#{table_name} WHERE pipeline_run_id IN (#{pr_ids})")
        end
      end
      Resque.enqueue(InitiateS3ProdSyncToStaging, @sample.id)
    end
    respond_to do |format|
      format.html { redirect_to @sample, notice: "S3 data is being synced from prod." }
      format.json { head :no_content }
    end
  end

  # PUT /samples/:id/kickoff_pipeline
  def kickoff_pipeline
    @sample.status = Sample::STATUS_RERUN
    @sample.save
    respond_to do |format|
      if !@sample.pipeline_runs.empty?
        format.html { redirect_to pipeline_runs_sample_path(@sample), notice: 'A pipeline run is in progress.' }
        format.json { head :no_content }
      else
        format.html { redirect_to pipeline_runs_sample_path(@sample), notice: 'No pipeline run in progress.' }
        format.json { render json: @sample.errors.full_messages, status: :unprocessable_entity }
      end
    end
  end

  # PUT /samples/:id/kickoff_pipeline
  def retry_pipeline
    @sample.status = Sample::STATUS_RETRY_PR
    @sample.save
    respond_to do |format|
      if !@sample.pipeline_runs.empty?
        format.html { redirect_to @sample, notice: 'A pipeline run is in progress.' }
        format.json { head :no_content }
      else
        format.html { redirect_to @sample, notice: 'No pipeline run in progress.' }
        format.json { render json: @sample.errors.full_messages, status: :unprocessable_entity }
      end
    end
  end

  def pipeline_runs
  end

  def cli_user_instructions
    render template: "samples/cli_user_instructions"
  end

  # PUT /samples/:id/upload_heartbeat
  def upload_heartbeat
    # Local uploads go directly from the browser to S3, so we don't know if an upload was
    # interrupted. User's browser will update this endpoint as a client heartbeat so we know if the
    # client is still actively uploading.
    @sample.update(client_updated_at: Time.now.utc)
    render json: {}, status: :ok
  end

  # Use callbacks to share common setup or constraints between actions.

  private

  def clean_taxid_name(pipeline_run, taxid)
    return 'all' if taxid == 'all'
    taxid_name = pipeline_run.taxon_counts.find_by(tax_id: taxid).name
    return "taxon-#{taxid}" unless taxid_name
    taxid_name.downcase.gsub(/\W/, "-")
  end

  def set_sample
    @sample = samples_scope.find(params[:id])
    assert_access
  end

  # Never trust parameters from the scary internet, only allow the white list through.
  def samples_params
    new_params = params.permit(samples: [:name, :project_id, :status, :host_genome_id, :host_genome_name,
                                         input_files_attributes: [:name, :presigned_url, :source_type, :source, :parts]])
    new_params[:samples] if new_params
  end

  def sample_params
    permitted_params = [:name, :project_name, :project_id, :status,
                        :s3_star_index_path, :s3_bowtie2_index_path,
                        :host_genome_id, :host_genome_name, :sample_location, :sample_date, :sample_tissue,
                        :sample_template, :sample_library, :sample_sequencer,
                        :sample_notes, :search, :subsample, :max_input_fragments,
                        :sample_input_pg, :sample_batch, :sample_diagnosis, :sample_organism, :sample_detection, :client,
                        input_files_attributes: [:name, :presigned_url, :source_type, :source, :parts]]
    permitted_params.concat([:pipeline_branch, :dag_vars, :s3_preload_result_path, :alignment_config_name, :subsample]) if current_user.admin?
    params.require(:sample).permit(*permitted_params)
  end

  def sort_by(samples, dir = nil)
    default_dir = 'id,desc'
    dir ||= default_dir
    column, direction = dir.split(',')
    samples = samples.order("samples.#{column} #{direction}") if column && direction
    samples
  end
end
