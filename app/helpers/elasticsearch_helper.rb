module ElasticsearchHelper
  MAX_SEARCH_RESULTS = 50

  def prefix_match(model, field, prefix, condition)
    prefix = sanitize(prefix)
    search_params = { query: { query_string: { query: "#{prefix}*", analyze_wildcard: true, fields: [field] } } }
    results = if Rails.env == "test"
                # Return all records. Tests can't use elasticsearch.
                # They focus on whether access control is enforced.
                model.all
              else
                model.__elasticsearch__.search(search_params).records
              end
    condition.each do |key, values|
      results = results.where(key => values)
    end
    results
  end

  def taxon_search(prefix, tax_levels = TaxonCount::NAME_2_LEVEL.keys, filters = {})
    return {} if Rails.env == "test"
    prefix = sanitize(prefix)

    matching_taxa = []
    taxon_ids = []
    tax_levels.each do |level|
      search_params = {
        size: ElasticsearchHelper::MAX_SEARCH_RESULTS,
        query: {
          query_string: {
            query: "#{prefix}*",
            fields: ["#{level}_name"]
          }
        },
        aggs: {
          distinct_taxa: {
            terms: {
              field: "#{level}_taxid"
            }
          }
        }
      }
      search_response = TaxonLineage.search(search_params)
      search_taxon_ids = search_response.aggregations.distinct_taxa.buckets.pluck(:key)

      taxon_data = TaxonLineage
                   .where("#{level}_taxid" => search_taxon_ids)
                   .order(id: :desc)
                   .distinct("#{level}_taxid")
                   .pluck("#{level}_name", "#{level}_taxid")
                   .map do |name, taxid|
                     {
                       "title" => name,
                       "description" => "Taxonomy ID: #{taxid}",
                       "taxid" => taxid,
                       "level" => level
                     }
                   end

      matching_taxa += taxon_data
      taxon_ids += search_taxon_ids
    end

    taxon_ids = filter_by_samples(taxon_ids, filters[:samples]) if filters[:samples]
    taxon_ids = filter_by_project(taxon_ids, filters[:project_id]) if filters[:project_id]

    return matching_taxa.select { |taxon| taxon_ids.include? taxon["taxid"] }
  end

  private

  def filter_by_samples(taxon_ids, samples)
    return samples
           .includes(
             :pipeline_runs,
             pipeline_runs: :taxon_counts)
           .where(pipeline_runs: { id: PipelineRun.select("max(id)").where(job_status: "CHECKED").group(:sample_id) })
           .where(taxon_counts:
             {
               tax_id: taxon_ids,
               count_type: ["NT", "NR"]
             })
           .where("`taxon_counts`.count > 0")
           .distinct(taxon_counts: :tax_id)
           .pluck(:tax_id)
  end

  # Took 250ms in local testing on real data
  def filter_by_project(taxon_ids, project_id)
    return Set.new(TaxonCount
      .includes(pipeline_run: :sample)
      .where(pipeline_runs: { id: PipelineRun.select("max(id)").where(job_status: "CHECKED").group(:sample_id) })
      .where(samples: { project_id: project_id })
      .where(tax_id: taxon_ids)
      .where(count_type: ["NT", "NR"])
      .where("count > 0")
      .distinct()
      .pluck(:tax_id))
  end

  def sanitize(prefix)
    # Add \\ to escape special characters. Four \ to escape the backslashes.
    # Escape anything that isn't in "a-zA-Z0-9 ._|'/"
    prefix.gsub(%r{([^a-zA-Z0-9 ._|'\/])}, '\\\\\1') if prefix
  end
end
