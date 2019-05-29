# This is a class of static helper methods for generating data for the heatmap
# visualization. See HeatmapHelperTest.
# See selectedOptions in SamplesHeatmapView for client-side defaults, and
# heatmap action in VisualizationsController.
module HeatmapHelper
  DEFAULT_MAX_NUM_TAXONS = 30
  # Zscore is best for heatmaps because it weighs the frequency against the background
  DEFAULT_TAXON_SORT_PARAM = 'highest_nt_zscore'.freeze
  READ_SPECIFICITY = true
  MINIMUM_READ_THRESHOLD = 5
  # Note: this is activated from the heatmap page by selecting "Viruses -
  # Phages". The default categories are all BUT phages, though the UI does not
  # indicate this.
  INCLUDE_PHAGE = false

  MINIMUM_ZSCORE_THRESHOLD = 1.7

  def self.sample_taxons_dict(params, samples)
    return {} if samples.empty?

    num_results = params[:taxonsPerSample] ? params[:taxonsPerSample].to_i : DEFAULT_MAX_NUM_TAXONS
    min_reads = params[:minReads] ? params[:minReads].to_i : MINIMUM_READ_THRESHOLD
    removed_taxon_ids = (params[:removedTaxonIds] || []).map do |x|
      begin
        Integer(x)
      rescue ArgumentError
        nil
      end
    end
    removed_taxon_ids = removed_taxon_ids.compact
    categories = params[:categories]
    threshold_filters = if params[:thresholdFilters].is_a?(Array)
                          (params[:thresholdFilters] || []).map { |filter| JSON.parse(filter || "{}") }
                        else
                          JSON.parse(params[:thresholdFilters] || "[]")
                        end
    subcategories = if params[:subcategories] && params[:subcategories].respond_to?(:to_h)
                      params[:subcategories].to_h
                    else
                      JSON.parse(params[:subcategories] || "{}")
                    end
    include_phage = subcategories.fetch("Viruses", []).include?("Phage")
    read_specificity = params[:readSpecificity] ? params[:readSpecificity].to_i == 1 : false

    # TODO: should fail if field is not well formatted and return proper error to client
    sort_by = params[:sortBy] || HeatmapHelper::DEFAULT_TAXON_SORT_PARAM
    species_selected = params[:species] ? params[:species].to_i == 1 : false # Otherwise genus selected

    first_sample = samples.first
    background_id = params[:background] ? params[:background].to_i : get_background_id(first_sample)

    taxon_ids = HeatmapHelper.top_taxons_details(
      samples,
      background_id,
      num_results,
      sort_by,
      species_selected,
      categories,
      threshold_filters,
      read_specificity,
      include_phage,
      min_reads
    ).pluck('tax_id')

    taxon_ids -= removed_taxon_ids

    HeatmapHelper.samples_taxons_details(
      samples,
      taxon_ids,
      background_id,
      species_selected,
      threshold_filters
    )
  end

  def self.top_taxons_details(
    samples,
    background_id,
    num_results,
    sort_by,
    species_selected,
    categories,
    threshold_filters = {},
    read_specificity = READ_SPECIFICITY,
    include_phage = INCLUDE_PHAGE,
    min_reads = MINIMUM_READ_THRESHOLD
  )
    # return top taxons
    results_by_pr = fetch_top_taxons(
      samples,
      background_id,
      categories,
      read_specificity,
      include_phage,
      num_results,
      min_reads,
      sort_by
    )

    sort = ReportHelper.decode_sort_by(sort_by)
    count_type = sort[:count_type]
    metric = sort[:metric]
    candidate_taxons = {}
    results_by_pr.each do |_pr_id, res|
      pr = res["pr"]
      taxon_counts = res["taxon_counts"]
      sample_id = pr.sample_id

      tax_2d = ReportHelper.taxon_counts_cleanup(taxon_counts)
      HeatmapHelper.only_species_or_genus_counts!(tax_2d, species_selected)

      rows = []
      tax_2d.each do |_tax_id, tax_info|
        rows << tax_info
      end

      HeatmapHelper.compute_aggregate_scores_v2!(rows)
      rows = rows.select do |row|
        row["NT"]["maxzscore"] >= MINIMUM_ZSCORE_THRESHOLD &&
          # Note: these are applied *after* SQL filters, so results may not be
          # 100% as expected .
          HeatmapHelper.check_custom_filters(row, threshold_filters)
      end

      # Get the top N for each sample. This re-sorts on the same metric as in
      # fetch_top_taxons SQL. We sort there first for performance.
      rows.sort_by! { |tax_info| ((tax_info[count_type] || {})[metric] || 0.0) * -1.0 }
      count = 1
      rows.each do |row|
        taxon = if candidate_taxons[row["tax_id"]]
                  candidate_taxons[row["tax_id"]]
                else
                  { "tax_id" => row["tax_id"], "samples" => {} }
                end
        taxon["max_aggregate_score"] = row[sort[:count_type]][sort[:metric]] if
          taxon["max_aggregate_score"].to_f < row[sort[:count_type]][sort[:metric]].to_f
        taxon["samples"][sample_id] = [count, row["tax_level"], row["NT"]["zscore"], row["NR"]["zscore"]]
        candidate_taxons[row["tax_id"]] = taxon
        break if count >= num_results
        count += 1
      end
    end

    candidate_taxons.values.sort_by { |taxon| -1.0 * taxon["max_aggregate_score"].to_f }
  end

  def self.fetch_top_taxons(
    samples,
    background_id,
    categories,
    read_specificity = READ_SPECIFICITY,
    include_phage = INCLUDE_PHAGE,
    num_results = 1_000_000,
    min_reads = MINIMUM_READ_THRESHOLD,
    sort_by = DEFAULT_TAXON_SORT_PARAM
  )
    categories_map = ReportHelper::CATEGORIES_TAXID_BY_NAME
    categories_clause = ""
    if categories.present?
      categories_clause = " AND superkingdom_taxid IN (#{categories.map { |category| categories_map[category] }.compact.join(',')})"
    elsif include_phage
      categories_clause = " AND superkingdom_taxid = #{categories_map['Viruses']}"
    end

    read_specificity_clause = ""
    if read_specificity
      read_specificity_clause = " AND taxon_counts.tax_id > 0"
    end

    if !include_phage && categories.present?
      phage_clause = " AND is_phage != 1"
    elsif include_phage && categories.blank?
      phage_clause = " AND is_phage = 1"
    end

    sort = ReportHelper.decode_sort_by(sort_by)

    # fraction_subsampled was introduced 2018-03-30. For prior runs, we assume
    # fraction_subsampled = 1.0.
    rpm_sql = "count / (
          (total_reads - total_ercc_reads) *
          COALESCE(fraction_subsampled, 1.0)
        ) * 1000 * 1000"

    zscore_sql = "COALESCE(
        GREATEST(#{ReportHelper::ZSCORE_MIN}, LEAST(#{ReportHelper::ZSCORE_MAX},
          (#{rpm_sql} - mean) / stdev
        )),
        #{ReportHelper::ZSCORE_WHEN_ABSENT_FROM_BACKGROUND})"

    query = "
    SELECT
      pipeline_run_id,
      taxon_counts.tax_id,
      taxon_counts.count_type,
      taxon_counts.tax_level,
      genus_taxid,
      family_taxid,
      taxon_counts.name,
      superkingdom_taxid,
      is_phage,
      count               AS  r,
      stdev,
      mean,
      percent_identity    AS  percentidentity,
      alignment_length    AS  alignmentlength,
      COALESCE(0.0 - e_value, #{ReportHelper::DEFAULT_SAMPLE_NEGLOGEVALUE}) AS neglogevalue,
      percent_concordant  AS  percentconcordant,
      -- First pass of ranking in SQL. Second pass in Ruby.
      #{rpm_sql} AS rpm,
      #{zscore_sql} AS zscore
    FROM taxon_counts
    JOIN pipeline_runs pr ON pipeline_run_id = pr.id
    LEFT OUTER JOIN taxon_summaries ON
      #{background_id.to_i}   = taxon_summaries.background_id   AND
      taxon_counts.count_type = taxon_summaries.count_type      AND
      taxon_counts.tax_level  = taxon_summaries.tax_level       AND
      taxon_counts.tax_id     = taxon_summaries.tax_id
    WHERE
      pipeline_run_id IN (
        SELECT MAX(id)
        FROM pipeline_runs
        WHERE sample_id IN (#{samples.pluck(:id).join(',')})
          AND job_status = '#{PipelineRun::STATUS_CHECKED}'
        GROUP BY sample_id
      )
      AND genus_taxid != #{TaxonLineage::BLACKLIST_GENUS_ID}
      AND count >= #{min_reads}
      -- We need both types of counts for threshold filters
      AND taxon_counts.count_type IN ('NT', 'NR')
      #{categories_clause}
      #{read_specificity_clause}
      #{phage_clause}
      AND #{zscore_sql} >= #{MINIMUM_ZSCORE_THRESHOLD}"

    # This query:
    # 1) assigns a rank to each row within a pipeline run
    # 2) returns rows ranking <= num_results
    # See http://www.sqlines.com/mysql/how-to/get_top_n_each_group
    top_n_query = "
      SELECT *
      FROM (
        SELECT
          @rank := IF(@current_id = pipeline_run_id, @rank + 1, 1) AS rank,
          @current_id := pipeline_run_id AS current_id,
          a.*
        FROM (
          #{query}
        ) a
        ORDER BY
          pipeline_run_id,
          count_type = '#{sort[:count_type]}' DESC,
          #{sort[:metric]} #{sort[:direction] == 'highest' ? 'DESC' : 'ASC'}
      ) b
      -- Overfetch by a factor of 4 to allow for post-SQL threshold filters
      WHERE rank <= #{num_results * 4};
    "

    # TODO: (gdingle): how do we protect against SQL injection?
    sql_results = TaxonCount.connection.select_all(top_n_query).to_hash

    # organizing the results by pipeline_run_id
    result_hash = {}

    pipeline_run_ids = sql_results.map { |x| x['pipeline_run_id'] }
    pipeline_runs = PipelineRun.where(id: pipeline_run_ids.uniq).includes([:sample])
    pipeline_runs_by_id = Hash[pipeline_runs.map { |x| [x.id, x] }]

    sql_results.each do |row|
      pipeline_run_id = row["pipeline_run_id"]
      if result_hash[pipeline_run_id]
        pr = result_hash[pipeline_run_id]["pr"]
      else
        pr = pipeline_runs_by_id[pipeline_run_id]
        result_hash[pipeline_run_id] = { "pr" => pr, "taxon_counts" => [] }
      end
      if pr.total_reads
        z_max = ReportHelper::ZSCORE_MAX
        z_min = ReportHelper::ZSCORE_MIN
        row["zscore"] = z_max if row["zscore"] > z_max &&
                                 row["zscore"] != ReportHelper::ZSCORE_WHEN_ABSENT_FROM_BACKGROUND
        row["zscore"] = z_min if row["zscore"] < z_min
        result_hash[pipeline_run_id]["taxon_counts"] << row
      end
    end
    result_hash
  end

  def self.samples_taxons_details(
    samples,
    taxon_ids,
    background_id,
    species_selected,
    threshold_filters
  )
    results = {}

    # Get sample results for the taxon ids
    unless taxon_ids.empty?
      samples_by_id = Hash[samples.map { |s| [s.id, s] }]
      parent_ids = ReportHelper.fetch_parent_ids(taxon_ids, samples)
      results_by_pr = HeatmapHelper.fetch_samples_taxons_counts(samples, taxon_ids, parent_ids, background_id)
      results_by_pr.each do |_pr_id, res|
        pr = res["pr"]
        taxon_counts = res["taxon_counts"]
        sample_id = pr.sample_id
        tax_2d = ReportHelper.taxon_counts_cleanup(taxon_counts)
        HeatmapHelper.only_species_or_genus_counts!(tax_2d, species_selected)

        rows = []
        tax_2d.each { |_tax_id, tax_info| rows << tax_info }
        HeatmapHelper.compute_aggregate_scores_v2!(rows)

        filtered_rows = rows
                        .select { |row| taxon_ids.include?(row["tax_id"]) }
                        .each { |row| row[:filtered] = HeatmapHelper.check_custom_filters(row, threshold_filters) }

        results[sample_id] = {
          sample_id: sample_id,
          name: samples_by_id[sample_id].name,
          metadata: samples_by_id[sample_id].metadata_with_base_type,
          host_genome_name: samples_by_id[sample_id].host_genome_name,
          taxons: filtered_rows
        }
      end
    end

    # For samples that didn't have matching taxons, just throw in the metadata.
    samples.each do |sample|
      unless results.key?(sample.id)
        results[sample.id] = {
          sample_id: sample.id,
          name: sample.name,
          metadata: sample.metadata_with_base_type,
          host_genome_name: sample.host_genome_name
        }
      end
    end

    # Flatten the hash
    results.values
  end

  def self.fetch_samples_taxons_counts(samples, taxon_ids, parent_ids, background_id)
    parent_ids = parent_ids.to_a
    parent_ids_clause = parent_ids.empty? ? "" : " OR taxon_counts.tax_id in (#{parent_ids.join(',')}) "

    # Note: subsample_fraction is of type 'float' so adjusted_total_reads is too
    # Note: stdev is never 0
    # Note: connection.select_all is TWICE faster than TaxonCount.select
    # (I/O latency goes from 2 seconds -> 0.8 seconds)
    # Had to derive rpm and zscore for each sample
    sql_results = TaxonCount.connection.select_all("
      SELECT
        taxon_counts.pipeline_run_id     AS  pipeline_run_id,
        taxon_counts.tax_id              AS  tax_id,
        taxon_counts.count_type          AS  count_type,
        taxon_counts.tax_level           AS  tax_level,
        taxon_counts.genus_taxid         AS  genus_taxid,
        taxon_counts.family_taxid        AS  family_taxid,
        taxon_counts.name                AS  name,
        taxon_counts.superkingdom_taxid  AS  superkingdom_taxid,
        taxon_counts.is_phage            AS  is_phage,
        taxon_counts.count               AS  r,
        taxon_summaries.stdev            AS stdev,
        taxon_summaries.mean             AS mean,
        taxon_counts.percent_identity    AS  percentidentity,
        taxon_counts.alignment_length    AS  alignmentlength,
        IF(
          taxon_counts.e_value IS NOT NULL,
          (0.0 - taxon_counts.e_value),
          #{ReportHelper::DEFAULT_SAMPLE_NEGLOGEVALUE}
        )                                AS  neglogevalue,
        taxon_counts.percent_concordant  AS  percentconcordant
      FROM taxon_counts
      LEFT OUTER JOIN taxon_summaries ON
        #{background_id.to_i}   = taxon_summaries.background_id   AND
        taxon_counts.count_type = taxon_summaries.count_type      AND
        taxon_counts.tax_level  = taxon_summaries.tax_level       AND
        taxon_counts.tax_id     = taxon_summaries.tax_id
      WHERE
        pipeline_run_id IN (
          SELECT MAX(id)
          FROM pipeline_runs
          WHERE sample_id IN (#{samples.pluck(:id).join(',')})
            AND job_status = '#{PipelineRun::STATUS_CHECKED}'
          GROUP BY sample_id
        )
        AND taxon_counts.genus_taxid != #{TaxonLineage::BLACKLIST_GENUS_ID}
        AND taxon_counts.count_type IN ('NT', 'NR')
        AND (taxon_counts.tax_id IN (#{taxon_ids.join(',')})
         #{parent_ids_clause}
         OR taxon_counts.genus_taxid IN (#{taxon_ids.join(',')}))").to_hash

    # calculating rpm and zscore, organizing the results by pipeline_run_id
    result_hash = {}

    pipeline_run_ids = sql_results.map { |x| x['pipeline_run_id'] }
    pipeline_runs = PipelineRun.where(id: pipeline_run_ids.uniq).includes([:sample])
    pipeline_runs_by_id = Hash[pipeline_runs.map { |x| [x.id, x] }]

    sql_results.each do |row|
      pipeline_run_id = row["pipeline_run_id"]
      if result_hash[pipeline_run_id]
        pr = result_hash[pipeline_run_id]["pr"]
      else
        pr = pipeline_runs_by_id[pipeline_run_id]
        result_hash[pipeline_run_id] = { "pr" => pr, "taxon_counts" => [] }
      end
      if pr.total_reads
        z_max = ReportHelper::ZSCORE_MAX
        z_min = ReportHelper::ZSCORE_MIN
        z_default = ReportHelper::ZSCORE_WHEN_ABSENT_FROM_BACKGROUND
        row["rpm"] = pr.rpm(row["r"])
        row["zscore"] = row["stdev"].nil? ? z_default : ((row["rpm"] - row["mean"]) / row["stdev"])
        row["zscore"] = z_max if row["zscore"] > z_max && row["zscore"] != z_default
        row["zscore"] = z_min if row["zscore"] < z_min
        result_hash[pipeline_run_id]["taxon_counts"] << row
      end
    end

    result_hash
  end

  def self.only_species_or_genus_counts!(tax_2d, species_selected)
    if species_selected # Species selected
      only_species_level_counts!(tax_2d)
    else # Genus selected
      only_genus_level_counts!(tax_2d)
    end
    tax_2d
  end

  def self.compute_aggregate_scores_v2!(rows)
    rows.each do |taxon_info|
      # NT and NR zscore are set to the same
      taxon_info['NT']['maxzscore'] = [taxon_info['NT']['zscore'], taxon_info['NR']['zscore']].max
      taxon_info['NR']['maxzscore'] = taxon_info['NT']['maxzscore']
    end
  end

  def self.check_custom_filters(row, threshold_filters)
    threshold_filters.each do |filter|
      count_type, metric = filter["metric"].split("_")
      begin
        value = Float(filter["value"])
      rescue
        Rails.logger.warn "Bad threshold filter value."
      else
        if filter["operator"] == ">="
          if row[count_type][metric] < value
            return false
          end
        elsif row[count_type][metric] > value
          return false
        end
      end
    end
    true
  end

  def self.only_species_level_counts!(taxon_counts_2d)
    taxon_counts_2d.keep_if { |_tax_id, tax_info| tax_info['tax_level'] == TaxonCount::TAX_LEVEL_SPECIES }
  end

  def self.only_genus_level_counts!(taxon_counts_2d)
    taxon_counts_2d.keep_if { |_tax_id, tax_info| tax_info['tax_level'] == TaxonCount::TAX_LEVEL_GENUS }
  end
end
