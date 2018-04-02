# Black list is generated by running
#  grep -i ',artificial sequences,' lineages.csv |cut -f 2 -d','  >> config/taxon_blacklist.txt
task :load_blacklist, [:blacklist_file] => :environment do |_t, args|
  File.open(args[:blacklist_file]).each do |taxon_id|
    taxon_id.chomp!
    tl = TaxonLineage.find_by(taxid: taxon_id.to_i)
    if tl
      tl.genus_taxid = TaxonLineage::BLACKLIST_GENUS_ID
      tl.genus_name = nil
      tl.save
    end
  end
end
