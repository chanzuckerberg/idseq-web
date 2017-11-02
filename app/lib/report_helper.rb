require 'csv'
require 'open3'

module ReportHelper
  # Truncate report table past this number of rows.
  MAX_ROWS = 3000

  ZSCORE_MIN = -99
  ZSCORE_MAX =  99
  ZSCORE_WHEN_ABSENT_FROM_SAMPLE = -100
  ZSCORE_WHEN_ABSENT_FROM_BACKGROUND = 100

  # TODO: For taxons that have no entry in the taxon_lineages table, we should
  # substitute this value for genus_id, which allows us to group them
  # all together;  this should match generate_aggregate_counts in
  # app/models/pipeline_output.rb
  MISSING_GENUS_ID = -200
  MISSING_SPECIES_ID = -100
  MISSING_SPECIES_ID_ALT = -1

  # For taxon_count 'species' rows without a corresponding 'genus' rows,
  # we create a fake singleton genus containing just that species;
  # the fake genus IDs start here:
  FAKE_GENUS_BASE = -1_900_000_000

  DECIMALS = 1

  DEFAULT_PARAMS = {
    view_level:       'genus',
    sort_by:          'highest_nt_aggregatescore',
    threshold_zscore: 1.7,
    threshold_rpm:    1.0,
    threshold_r:      50,
    threshold_percentidentity: 0.0,
    threshold_alignmentlength: 0.0,
    threshold_neglogevalue:    0.0,
    threshold_aggregatescore:  0.0,
    excluded_categories: 'None',
    selected_genus: 'None',
    disable_filters: 0
  }.freeze
  IGNORED_PARAMS = [:controller, :action, :id].freeze

  VIEW_LEVELS = %w[species genus].freeze
  SORT_DIRECTIONS = %w[highest lowest].freeze
  # We do not allow underscores in metric names, sorry!
  METRICS = %w[r rpm zscore percentidentity alignmentlength neglogevalue aggregatescore].freeze
  COUNT_TYPES = %w[NT NR].freeze
  PROPERTIES_OF_TAXID = %w[tax_id name name_from_lineages name_from_counts tax_level genus_taxid category_name].freeze # note: no underscore in sortable column names
  UNUSED_IN_UI_FIELDS = [:sort_key].freeze

  # use the metric's NT <=> NR dual as a tertiary sort key (so, for example,
  # when you sort by NT R, entries without NT R will be ordered amongst
  # themselves based on their NR R (as opposed to arbitrary ordder);
  # and within the Z, for things with equal Z, use the R as tertiary
  OTHER_COUNT_TYPE = {
    'NT' => 'NR',
    'NR' => 'NT'
  }.freeze
  OTHER_METRIC = {
    'zscore' => 'r',
    'r' => 'zscore',
    'rpm' => 'zscore'
  }.freeze

  def threshold_param?(param_key)
    parts = param_key.to_s.split "_"
    (parts.length == 2 && parts[0] == 'threshold' && METRICS.include?(parts[1]))
  end

  def decode_thresholds(params)
    thresholds = {}
    METRICS.each do |metric|
      param_key = "threshold_#{metric}".to_sym
      thresholds[metric] = params[param_key]
    end
    thresholds
  end

  def decode_sort_by(sort_by)
    parts = sort_by.split "_"
    return nil unless parts.length == 3
    direction = parts[0]
    return nil unless SORT_DIRECTIONS.include? direction
    count_type = parts[1].upcase
    return nil unless COUNT_TYPES.include? count_type
    metric = parts[2]
    return nil unless METRICS.include? metric
    {
      direction:    direction,
      count_type:   count_type,
      metric:       metric
    }
  end

  def number_or_nil(string)
    Float(string || '')
  rescue ArgumentError
    nil
  end

  ZERO_ONE = {
    '0' => 0,
    '1' => 1
  }.freeze

  def valid_arg_value(name, value, all_cats)
    # return appropriately validated value (based on name), or nil
    return nil unless value
    if name == :view_level
      value = value.downcase
      value = nil unless VIEW_LEVELS.include? value
    elsif name == :sort_by
      value = nil unless decode_sort_by(value)
    elsif name == :excluded_categories
      value = validated_excluded_categories_or_nil(value, all_cats)
    elsif name == :selected_genus
      # This gets validated later in taxonomy_details()
      value = value
    elsif name == :disable_filters
      value = ZERO_ONE[value]
    else
      value = nil unless threshold_param?(name)
      value = number_or_nil(value)
    end
    value
  end

  def decode_excluded_categories(param_str)
    Set.new(param_str.split(",").map { |x| x.strip.capitalize })
  end

  def validated_excluded_categories_or_nil(str, all_cats)
    all_categories = Set.new(all_cats.map { |x| x['name'] })
    all_categories.add('None')
    excluded_categories = all_categories & decode_excluded_categories(str)
    validated_str = Array(excluded_categories).map(&:capitalize).join(',')
    !validated_str.empty? ? validated_str : nil
  end

  def clean_params(raw, all_cats)
    clean = {}
    raw_hash = {}
    raw.each do |name, value|
      raw_hash[name] = value
    end
    raw = raw_hash
    DEFAULT_PARAMS.each do |name, default_value|
      raw_name = name.to_s
      clean[name] = valid_arg_value(name, raw[raw_name], all_cats) || default_value
      raw.delete(raw_name)
    end
    IGNORED_PARAMS.each do |name|
      raw_name = name.to_s
      raw.delete(raw_name)
    end
    logger.warn "Ignoring #{raw.length} report params: #{raw}." unless raw.empty?
    clean
  end

  def external_report_info(report, params)
    return {} if report.nil?
    all_cats = all_categories
    params = clean_params(params, all_cats)
    data = {}
    data[:report_details] = report_details(report)
    data[:taxonomy_details], data[:all_genera_in_sample] = taxonomy_details(report, params)
    data[:all_categories] = all_cats
    data[:report_page_params] = params
    data
  end

  def taxon_fastas_present?(report)
    s3_path_hash = report.pipeline_output.sample.s3_paths_for_taxon_byteranges
    s3_path_hash.each do |_tax_level, h|
      h.each do |_hit_type, s3_path|
        command = "aws s3 ls #{s3_path}"
        _stdout, _stderr, status = Open3.capture3(command)
        return false unless status.exitstatus.zero?
      end
    end
    true
  end

  def report_details(report)
    {
      report_info: report,
      pipeline_info: report.pipeline_output,
      sample_info: report.pipeline_output.sample,
      project_info: report.pipeline_output.sample.project,
      background_model: report.background,
      taxon_fasta_flag: taxon_fastas_present?(report)
    }
  end

  def all_categories
    # This query takes 1.4 seconds and the results are static, so we hardcoded it
    # mysql> select distinct(superkingdom_taxid) as taxid, IF(superkingdom_name IS NOT NULL, superkingdom_name, 'Uncategorized') as name from taxon_lineages;
    # +-------+---------------+
    # | taxid | name          |
    # +-------+---------------+
    # |  -700 | Uncategorized |
    # |     2 | Bacteria      |
    # |  2157 | Archaea       |
    # |  2759 | Eukaryota     |
    # | 10239 | Viruses       |
    # | 12884 | Viroids       |
    # +-------+---------------+
    [
      { 'taxid' => 2, 'name' => "Bacteria" },
      { 'taxid' => 2157, 'name' => "Archaea" },
      { 'taxid' => 2759, 'name' => "Eukaryota" },
      { 'taxid' => 10_239, 'name' => "Viruses" },
      { 'taxid' => 12_884, 'name' => "Viroids" },
      { 'taxid' => -700, 'name' => "Uncategorized" }
    ]
  end

  def fetch_taxon_counts(report)
    pipeline_output_id = report.pipeline_output.id
    total_reads = report.pipeline_output.total_reads
    background_id = report.background.id
    # Note: stdev is never 0
    # Note: connection.select_all is TWICE faster than TaxonCount.select
    # (I/O latency goes from 2 seconds -> 0.8 seconds)
    TaxonCount.connection.select_all("
      SELECT
      taxon_counts.tax_id              AS  tax_id,
      taxon_counts.count_type          AS  count_type,
      taxon_counts.tax_level           AS  tax_level,
      IF (
        taxon_lineages.genus_taxid IS NOT NULL,
        taxon_lineages.genus_taxid,
        #{MISSING_GENUS_ID}
      )                                AS  genus_taxid,
      IF(
        taxon_counts.tax_level=#{TaxonCount::TAX_LEVEL_SPECIES},
        taxon_lineages.species_name,
        taxon_lineages.genus_name
      )                                AS  name_from_lineages,
      taxon_counts.name                AS  name_from_counts,
      taxon_lineages.superkingdom_name AS  category_name,
      taxon_counts.count               AS  r,
      (count / #{total_reads}.0
        * 1000000.0)                   AS  rpm,
      IF(
        stdev IS NOT NULL,
        GREATEST(#{ZSCORE_MIN}, LEAST(#{ZSCORE_MAX}, (((count / #{total_reads}.0 * 1000000.0) - mean) / stdev))),
        #{ZSCORE_WHEN_ABSENT_FROM_BACKGROUND}
      )
                                       AS  zscore,
      taxon_counts.percent_identity    AS  percentidentity,
      taxon_counts.alignment_length    AS  alignmentlength,
      IF(
        taxon_counts.e_value IS NOT NULL,
        (0.0 - taxon_counts.e_value),
        NULL
      )                                AS  neglogevalue
      FROM taxon_counts
      LEFT OUTER JOIN taxon_summaries ON
        taxon_counts.tax_id     = taxon_summaries.tax_id          AND
        taxon_counts.count_type = taxon_summaries.count_type      AND
        taxon_counts.tax_level  = taxon_summaries.tax_level       AND
        #{background_id}        = taxon_summaries.background_id
      LEFT OUTER JOIN taxon_lineages ON
        taxon_counts.tax_id = taxon_lineages.taxid
      WHERE
        pipeline_output_id = #{pipeline_output_id} AND
        taxon_counts.count_type IN ('NT', 'NR')
    ").to_hash
  end

  def zero_metrics(count_type)
    {
      'count_type' => count_type,
      'r' => 0,
      'rpm' => 0,
      'zscore' => ZSCORE_WHEN_ABSENT_FROM_SAMPLE,
      'percentidentity' => 0,
      'alignmentlength' => 0,
      'neglogevalue' => 0
    }
  end

  def tax_info_base(taxon)
    tax_info_base = {}
    PROPERTIES_OF_TAXID.each do |prop|
      tax_info_base[prop] = taxon[prop]
    end
    COUNT_TYPES.each do |count_type|
      tax_info_base[count_type] = zero_metrics(count_type)
    end
    tax_info_base
  end

  def metric_props(taxon)
    metric_props = zero_metrics(taxon['count_type'])
    METRICS.each do |metric|
      metric_props[metric] = taxon[metric].round(DECIMALS) if taxon[metric]
    end
    metric_props
  end

  def fake_genus!(tax_info)
    # Create a singleton genus containing just this taxon
    #
    # This is a workaround for a bug we are fixing soon... but leaving
    # in the code lest that bug recurs.  A warning will be logged.
    #
    fake_genus_info = tax_info.clone
    fake_genus_info['name'] = "#{tax_info['name']} fake genus"
    fake_genus_id = FAKE_GENUS_BASE - tax_info['tax_id']
    fake_genus_info['tax_id'] = fake_genus_id
    fake_genus_info['genus_taxid'] = fake_genus_id
    fake_genus_info['tax_level'] = TaxonCount::TAX_LEVEL_GENUS
    tax_info['genus_taxid'] = fake_genus_id
    fake_genus_info
  end

  def convert_2d(taxon_counts_from_sql)
    # Return data structured as
    #    tax_id => {
    #       tax_id,
    #       tax_level,
    #       genus_taxid,
    #       species_count,
    #       name,
    #       category_name,
    #       NR => {
    #         count_type,
    #         r,
    #         rpm
    #         zscore
    #       }
    #       NT => {
    #         count_type,
    #         r,
    #         rpm
    #         zscore
    #       }
    #    }
    taxon_counts_2d = {}
    taxon_counts_from_sql.each do |t|
      taxon_counts_2d[t['tax_id']] ||= tax_info_base(t)
      taxon_counts_2d[t['tax_id']][t['count_type']] = metric_props(t)
    end
    taxon_counts_2d
  end

  def cleanup_genus_ids!(taxon_counts_2d)
    # We might rewrite the query to be super sure of this
    taxon_counts_2d.each do |tax_id, tax_info|
      if tax_info['tax_level'] == TaxonCount::TAX_LEVEL_GENUS
        tax_info['genus_taxid'] = tax_id
      end
    end
    taxon_counts_2d
  end

  def cleanup_names!(taxon_counts_2d)
    # There are still taxons without names
    missing_names = Set.new
    taxon_counts_2d.each do |tax_id, tax_info|
      name_from_lineages = tax_info.delete('name_from_lineages')
      name_from_counts = tax_info.delete('name_from_counts')
      if tax_id < 0
        # Usually -1 means accession number did not resolve to species.
        # TODO: Can we keep the accession numbers to show in these cases?
        level_str = tax_info['tax_level'] == TaxonCount::TAX_LEVEL_SPECIES ? 'species' : 'genus'
        tax_info['name'] = "All taxa without #{level_str} classification"
        if tax_id != MISSING_SPECIES_ID && tax_id != MISSING_SPECIES_ID_ALT && tax_id != MISSING_GENUS_ID
          tax_info['name'] += " #{tax_id}"
        end
      else
        missing_names.add(tax_id) unless name_from_lineages
        tax_info['name'] = (
          name_from_lineages ||
          name_from_counts ||
          "Unnamed taxon #{tax_id}"
        )
      end
      tax_info['category_name'] ||= 'Uncategorized'
    end
    logger.warn "Missing taxon_lineages names for taxon ids #{missing_names.to_a}" unless missing_names.empty?
    taxon_counts_2d
  end

  def cleanup_missing_genus_counts!(taxon_counts_2d)
    # there should be a genus_pair for every species (even if it is the pseudo
    # genus id -200);  anything else indicates a bug in data import;
    # warn and ensure affected data is NOT hidden from view
    fake_genuses = []
    missing_genuses = Set.new
    taxids_with_missing_genuses = Set.new
    taxon_counts_2d.each do |tax_id, tax_info|
      genus_taxid = tax_info['genus_taxid']
      unless taxon_counts_2d[genus_taxid]
        taxids_with_missing_genuses.add(tax_id)
        missing_genuses.add(genus_taxid)
        fake_genuses << fake_genus!(tax_info)
      end
    end
    logger.warn "Missing taxon_counts for genus ids #{missing_genuses.to_a} corresponding to taxon ids #{taxids_with_missing_genuses.to_a}." unless missing_genuses.empty?
    fake_genuses.each do |fake_genus_info|
      taxon_counts_2d[fake_genus_info['genus_taxid']] = fake_genus_info
    end
    taxon_counts_2d
  end

  def count_species_per_genus!(taxon_counts_2d)
    taxon_counts_2d.each do |_tax_id, tax_info|
      tax_info['species_count'] = 0
    end
    taxon_counts_2d.each do |_tax_id, tax_info|
      next unless tax_info['tax_level'] == TaxonCount::TAX_LEVEL_SPECIES
      genus_info = taxon_counts_2d[tax_info['genus_taxid']]
      genus_info['species_count'] += 1
    end
    taxon_counts_2d
  end

  def cleanup_all!(taxon_counts_2d)
    # t0 = Time.now
    cleanup_genus_ids!(taxon_counts_2d)
    cleanup_names!(taxon_counts_2d)
    cleanup_missing_genus_counts!(taxon_counts_2d)
    # t1 = Time.now
    # logger.info "Data cleanup took #{t1 - t0} seconds."
    taxon_counts_2d
  end

  def negative(vec_10d)
    # vec_10d.map {|x| -x}
    vec_10d.map(&:-@)
  end

  def sort_key(tax_2d, tax_info, sort_by)
    # sort by (genus, species) in the chosen metric, making sure that
    # the genus comes before its species in either sort direction
    genus_id = tax_info['genus_taxid']
    genus_info = tax_2d[genus_id]
    # this got a lot longer after it became clear that we want other_type and other_metric
    # TODO: refactor
    sort_count_type = sort_by[:count_type]
    other_count_type = OTHER_COUNT_TYPE.fetch(sort_count_type, sort_count_type)
    sort_metric = sort_by[:metric]
    other_metric = OTHER_METRIC.fetch(sort_metric, sort_metric)
    sort_key_genus = genus_info[sort_count_type][sort_metric]
    sort_key_genus_alt = genus_info[other_count_type][sort_metric]
    sort_key_genus_om = genus_info[sort_count_type][other_metric]
    sort_key_genus_om_alt = genus_info[other_count_type][other_metric]
    if tax_info['tax_level'] == TaxonCount::TAX_LEVEL_SPECIES
      sort_key_species = tax_info[sort_count_type][sort_metric]
      sort_key_species_alt = tax_info[other_count_type][sort_metric]
      sort_key_species_om = tax_info[sort_count_type][other_metric]
      sort_key_species_om_alt = tax_info[other_count_type][other_metric]
      # sort_key_3d = [sort_key_genus, sort_key_genus_alt, sort_key_genus_om, sort_key_genus_om_alt, genus_id, 0, sort_key_species, sort_key_species_alt, sort_key_species_om, sort_key_species_om_alt]
      sort_key_3d = [sort_key_genus, sort_key_genus_om, sort_key_genus_alt, sort_key_genus_om_alt, genus_id, 0, sort_key_species, sort_key_species_om, sort_key_species_alt, sort_key_species_om_alt]
    else
      genus_priority = sort_by[:direction] == 'highest' ? 1 : -1
      # sort_key_3d = [sort_key_genus, sort_key_genus_alt, sort_key_genus_om, sort_key_genus_om_alt, genus_id, genus_priority, 0, 0, 0, 0]
      sort_key_3d = [sort_key_genus, sort_key_genus_om, sort_key_genus_alt, sort_key_genus_om_alt, genus_id, genus_priority, 0, 0, 0, 0]
    end
    sort_by[:direction] == 'lowest' ? sort_key_3d : negative(sort_key_3d)
  end

  def filter_rows!(rows, thresholds, excluded_categories)
    # filter out rows that are below the thresholds in both NR and NT
    # but make sure not to delete any genus row for which some species
    # passes the filters
    to_delete = Set.new
    to_keep = Set.new
    rows.each do |tax_info|
      should_delete = false
      # if any metric is below threshold in every type, delete
      METRICS.each do |metric|
        should_delete = COUNT_TYPES.all? { |count_type| tax_info[count_type][metric] < thresholds[metric] }
        break if should_delete
      end
      if tax_info['tax_id'] != MISSING_GENUS_ID
        if excluded_categories.include? tax_info['category_name']
          # The only way a species and its genus can have different category
          # names:  If genus_id == MISSING_GENUS_ID.  For all other species
          # and genera, the category filter would exclude both the genus
          # and species underneath that genus.
          should_delete = true
        end
      end
      if should_delete
        to_delete.add(tax_info['tax_id'])
      else
        # if we are not deleting it, make sure to keep around its genus
        to_keep.add(tax_info['genus_taxid'])
      end
    end
    to_delete.subtract(to_keep)
    rows.keep_if { |tax_info| !to_delete.include? tax_info['tax_id'] }
    rows
  end

  def aggregate_score(genus_info, species_info)
    aggregate = 0.0
    COUNT_TYPES.each do |count_type|
      aggregate += (
        species_info[count_type]['zscore'] *
        genus_info[count_type]['zscore'].abs *
        species_info[count_type]['rpm']
      )
    end
    aggregate
  end

  def compute_aggregate_scores!(tax_2d)
    tax_2d.each do |_tax_id, tax_info|
      next unless tax_info['tax_level'] == TaxonCount::TAX_LEVEL_SPECIES
      species_info = tax_info
      genus_id = species_info['genus_taxid']
      genus_info = tax_2d[genus_id]
      species_score = aggregate_score(genus_info, tax_info)
      species_info['NT']['aggregatescore'] = species_score
      genus_info['NT']['aggregatescore'] = species_score unless genus_info['NT']['aggregatescore'] && genus_info['NT']['aggregatescore'] > species_score
    end
    tax_2d.each do |_tax_id, tax_info|
      tax_info['NR']['aggregatescore'] = tax_info['NT']['aggregatescore']
    end
    tax_2d
  end

  def wall_clock_ms
    # used for rudimentary perf analysis
    Time.now.to_f
  end

  def apply_filters!(rows, tax_2d, all_genera, params)
    thresholds = decode_thresholds(params)
    excluded_categories = decode_excluded_categories(params[:excluded_categories])
    if all_genera.include? params[:selected_genus]
      # Apply only the genus filter.
      rows.keep_if do |tax_info|
        genus_taxid = tax_info['genus_taxid']
        genus_name = tax_2d[genus_taxid]['name']
        genus_name == params[:selected_genus]
      end
    else
      # Rare case of param cleanup this deep...
      params[:selected_genus] = DEFAULT_PARAMS[:selected_genus]
      # Apply all but the genus filter.
      filter_rows!(rows, thresholds, excluded_categories)
    end
  end

  def taxonomy_details(report, params)
    # Fetch and clean data.
    t0 = wall_clock_ms
    tax_2d = cleanup_all!(convert_2d(fetch_taxon_counts(report)))
    t1 = wall_clock_ms

    # These counts are shown in the UI on each genus line.
    count_species_per_genus!(tax_2d)

    # Pull out all genera names in sample (before filters are applied).
    all_genera = Set.new
    tax_2d.each do |_tax_id, tax_info|
      tax_name = tax_info['name']
      tax_level = tax_info['tax_level']
      all_genera.add(tax_name) if tax_level == TaxonCount::TAX_LEVEL_GENUS
    end
    # This gets returned to UI for the genus search autoselect dropdown.
    all_genera_in_sample = all_genera.sort_by(&:downcase)

    # Compute all aggregate scores.
    compute_aggregate_scores!(tax_2d)

    # Filter out species rows if selected level is genus.
    rows = []
    view_level_int = TaxonCount::NAME_2_LEVEL[params[:view_level].downcase]
    tax_2d.each do |_tax_id, tax_info|
      next unless tax_info['tax_level'] >= view_level_int
      rows << tax_info
    end

    # Total number of rows for view level, before application of filters.
    rows_total = rows.length

    # Compute sort key and sort.
    sort_by = decode_sort_by(params[:sort_by])
    rows.each do |tax_info|
      tax_info[:sort_key] = sort_key(tax_2d, tax_info, sort_by)
    end
    rows.sort_by! { |tax_info| tax_info[:sort_key] }

    # Apply filters, unless disabled for CSV download.
    unless params[:disable_filters] == 1
      apply_filters!(rows, tax_2d, all_genera, params)
    end

    # These stats are displayed at the bottom of the page.
    rows_passing_filters = rows.length

    # HACK
    rows = rows[0...MAX_ROWS]

    # Delete fields that are unused in the UI.
    rows.each do |tax_info|
      UNUSED_IN_UI_FIELDS.each do |unused_field|
        tax_info.delete(unused_field)
      end
    end

    t5 = wall_clock_ms
    logger.info "Data processing took #{t5 - t1} seconds (#{t5 - t0} with I/O)."

    [[rows_passing_filters, rows_total, rows], all_genera_in_sample]
  end

  def get_tax_detail(tax_info, column_name)
    # convenience function used only in generate_report_csv
    if column_name.include?(".")
      parts = column_name.split(".")
      hit_type = parts[0]
      metric = parts[1]
      tax_info[hit_type][metric]
    else
      tax_info[column_name]
    end
  end

  def generate_report_csv(report_info)
    rows = report_info[:taxonomy_details][1]
    view_level_int = TaxonCount::NAME_2_LEVEL[report_info[:report_page_params][:view_level].downcase]
    attributes = %w[category_name tax_id name NT.zscore NT.rpm NT.r NR.zscore NR.rpm NR.r]
    CSV.generate(headers: true) do |csv|
      csv << attributes
      rows.each do |tax_info|
        next unless tax_info['tax_level'] == view_level_int
        csv << attributes.map { |attr| get_tax_detail(tax_info, attr) }
      end
    end
  end
end
