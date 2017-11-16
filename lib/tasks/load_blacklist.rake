# Black list is generated by running aws_batch/black_list.py |cut -f2 -d ',' |sort|uniq > blacklist.txt
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
