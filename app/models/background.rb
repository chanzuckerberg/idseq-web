class Background < ApplicationRecord
  has_and_belongs_to_many :samples
  has_and_belongs_to_many :pipeline_outputs
  has_many :reports, dependent: :destroy
  has_many :taxon_summaries, dependent: :destroy
  validate :validate_size

  DEFAULT_BACKGROUND_MODEL_NAME = "default".freeze
  TAXON_SUMMARY_CHUNK_SIZE = 100

  def validate_size
    errors.add(:base, "Need to select at least 2 pipeline runs.") if pipeline_outputs.size < 2
  end

  def summarize
    results = TaxonCount.connection.select_all("SELECT tax_id, count_type, tax_level, name, sum((1.0*1e6*count)/total_reads) as sum_rpm, sum((1.0*1e6*count*1e6*count)/(total_reads*total_reads)) as sum_rpm2 FROM `taxon_counts` INNER JOIN `pipeline_outputs` ON `pipeline_outputs`.`id` = `taxon_counts`.`pipeline_output_id` WHERE (pipeline_output_id in (select pipeline_output_id from backgrounds_pipeline_outputs where background_id = #{id}))  GROUP BY tax_id, count_type, tax_level, name").to_hash
    n = pipeline_outputs.count
    date = DateTime.now.in_time_zone
    results.each do |h|
      h[:background_id] = id
      h[:created_at] = date
      h[:updated_at] = date
      h[:mean] = h["sum_rpm"] / n.to_f
      h[:stdev] = compute_stdev(h["sum_rpm"], h["sum_rpm2"], n)
    end
    results
  end

  def store_summary
    data = summarize.map { |h| h.slice('tax_id', 'count_type', 'tax_level', 'name', :background_id, :created_at, :updated_at, :mean, :stdev) }
    data_chunks = data.in_groups_of(TAXON_SUMMARY_CHUNK_SIZE, false)
    data_chunks.each do |chunk|
      columns = chunk.first.keys
      values_list = chunk.map do |hash|
        hash.values.map do |value|
          ActiveRecord::Base.connection.quote(value)
        end
      end
      ActiveRecord::Base.connection.execute <<-SQL
      DELETE FROM taxon_summaries WHERE background_id = #{id}
      SQL
      ActiveRecord::Base.connection.execute <<-SQL
      INSERT INTO taxon_summaries (#{columns.join(',')}) VALUES #{values_list.map { |values| "(#{values.join(',')})" }.join(', ')}
      SQL
    end
  end

  def compute_stdev(sum, sum2, n)
    Math.sqrt((sum2 - sum**2 / n.to_f) / (n - 1))
  end
end
