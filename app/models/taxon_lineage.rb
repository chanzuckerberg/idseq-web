# The TaxonLineage model gives the taxids forming the taxonomic lineage of any given species-level taxid.
class TaxonLineage < ApplicationRecord
  MISSING_SPECIES_ID = -100
  MISSING_SPECIES_ID_ALT = -1
  MISSING_GENUS_ID = -200
  BLACKLIST_GENUS_ID = -201
  MISSING_FAMILY_ID = -300
  MISSING_ORDER_ID = -400
  MISSING_CLASS_ID = -500
  MISSING_PHYLUM_ID = -600
  MISSING_SUPERKINGDOM_ID = -700
  MISSING_LINEAGE_ID = {
    species: MISSING_SPECIES_ID,
    genus: MISSING_GENUS_ID,
    family: MISSING_FAMILY_ID,
    order: MISSING_ORDER_ID,
    class: MISSING_CLASS_ID,
    phylum: MISSING_PHYLUM_ID,
    superkingdom: MISSING_SUPERKINGDOM_ID
  }.freeze

  # We label as 'phage' all of the prokaryotic (bacterial and archaeal) virus families
  # listed here: https://en.wikipedia.org/wiki/Bacteriophage
  # PHAGE_FAMILIES_NAMES = ['Myoviridae', 'Siphoviridae', 'Podoviridae', 'Lipothrixviridae',
  #                         'Rudiviridae', 'Ampullaviridae', 'Bicaudaviridae', 'Clavaviridae',
  #                         'Corticoviridae', 'Cystoviridae', 'Fuselloviridae', 'Globuloviridae',
  #                         'Guttaviridae', 'Inoviridae', 'Leviviridae', 'Microviridae',
  #                         'Plasmaviridae', 'Tectiviridae']
  # PHAGE_FAMILIES_TAXIDS = TaxonLineage.where(family_name: PHAGE_PHYLA_NAMES).map(&:family_taxid).compact.uniq.sort
  PHAGE_FAMILIES_TAXIDS = [10_472, 10_474, 10_477, 10_656, 10_659, 10_662, 10_699, 10_744, 10_841, 10_860,
                           10_877, 11_989, 157_897, 292_638, 324_686, 423_358, 573_053, 1_232_737].freeze

  # HACK: Implement fungus filter by listing current fungus phyla. Eventually we should have 'kingdom' as a column
  # in taxon_lineages, so that the fungus classification is accurate gets updated with every update of NCBI taxonomy.
  # For fungus phyla, see: https://myhits.isb-sib.ch/cgi-bin/view_cla_entry?name=taxid:4751. Filtering these is
  # currently the best we can do. As there are some fungi not classified into a phylum, this implementation
  # of the fungus filter is not totally accurate.
  FUNGUS_PHYLA_TAXIDS = [1_264_859, 6029, 4761, 451_455, 1_031_332, 451_459, 214_504].freeze

  def self.get_genus_info(genus_tax_id)
    r = find_by(genus_taxid: genus_tax_id)
    return { query: r.genus_name, tax_id: genus_tax_id } if r
  end
end
