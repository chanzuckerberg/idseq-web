class AddSampleCountToHostGenome < ActiveRecord::Migration[5.1]
  def change
    add_column :host_genomes, :samples_count, :integer, default: 0, null: false, comment: 'Added to enable ranking of host genomes by popularity'
  end
end
