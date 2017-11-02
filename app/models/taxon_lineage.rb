# The TaxonLineage model gives the taxids forming the taxonomic lineage of any given species-level taxid.
class TaxonLineage < ApplicationRecord
  BLACKLIST_GENUS_ID = -201
  def self.get_genus_info(genus_tax_id)
    r = find_by(genus_taxid: genus_tax_id)
    return { query: r.genus_name, tax_id: genus_tax_id } if r
  end
end
