require 'rails_helper'
require 'json'
require 'pp'

RSpec.describe PipelineReportService, type: :service do
  context "converted report test for species taxid 573" do
    before do
      ResqueSpec.reset!

      @pipeline_run = create(:pipeline_run,
                             sample: create(:sample, project: create(:project)),
                             total_reads: 1122,
                             adjusted_remaining_reads: 316,
                             subsample: 1_000_000,
                             taxon_counts_data: [{
                               tax_id: 573,
                               tax_level: 1,
                               taxon_name: "Klebsiella pneumoniae",
                               nt: 209,
                               percent_identity: 99.6995,
                               alignment_length: 149.402,
                               e_value: -89.5641,
                               genus_taxid: 570,
                               superkingdom_taxid: 2,
                             }, {
                               tax_id: 573,
                               tax_level: 1,
                               taxon_name: "Klebsiella pneumoniae",
                               nr: 69,
                               percent_identity: 97.8565,
                               alignment_length: 46.3623,
                               e_value: -16.9101,
                               genus_taxid: 570,
                               superkingdom_taxid: 2,
                             }, {
                               tax_id: 570,
                               tax_level: 2,
                               nt: 217,
                               taxon_name: "Klebsiella",
                               percent_identity: 99.7014,
                               alignment_length: 149.424,
                               e_value: -89.5822,
                               genus_taxid: 570,
                               superkingdom_taxid: 2,
                             }, {
                               tax_id: 570,
                               tax_level: 2,
                               nr: 87,
                               taxon_name: "Klebsiella",
                               percent_identity: 97.9598,
                               alignment_length: 46.4253,
                               e_value: -16.9874,
                               genus_taxid: 570,
                               superkingdom_taxid: 2,
                             },])

      @background = create(:background,
                           pipeline_run_ids: [
                             create(:pipeline_run,
                                    sample: create(:sample, project: create(:project))).id,
                             create(:pipeline_run,
                                    sample: create(:sample, project: create(:project))).id,
                           ],
                           taxon_summaries_data: [{
                             tax_id: 573,
                             count_type: "NR",
                             tax_level: 1,
                             mean: 29.9171,
                             stdev: 236.332,
                           }, {
                             tax_id: 573,
                             count_type: "NT",
                             tax_level: 1,
                             mean: 9.35068,
                             stdev: 26.4471,
                           }, {
                             tax_id: 570,
                             count_type: "NR",
                             tax_level: 2,
                             mean: 35.0207,
                             stdev: 238.639,
                           }, {
                             tax_id: 570,
                             count_type: "NT",
                             tax_level: 2,
                             mean: 18.3311,
                             stdev: 64.2056,
                           },])

      @report = PipelineReportService.call(@pipeline_run.id, @background.id)
    end

    it "should get correct species values" do
      species_result = {
        "genus_tax_id" => 570,
        "name" => "Klebsiella pneumoniae",
        "nt" => {
          "count" => 209,
          "rpm" => 186_274.50980392157, # previously rounded to 186_274.509
          "z_score" => 99.0,
        },
        "nr" => {
          "count" => 69,
          "rpm" => 61_497.326203208555, # previously rounded to 61_497.326
          "z_score" => 99.0,
        },
        "agg_score" => 2_428_411_764.7058825, # previously rounded to 2_428_411_754.8
      }

      expect(JSON.parse(@report)["counts"]["1"]["573"]).to include_json(species_result)
    end

    it "should get correct genus values" do
      genus_result = {
        "genus_tax_id" => 570,
        "nt" => {
          "count" => 217.0,
          "rpm" => 193_404.63458110517, # previously rounded to 193_404.634
          "z_score" => 99.0,
          "e_value" => 89.5822,
        },
        "nr" => {
          "count" => 87.0,
          "rpm" => 77_540.10695187165, # previously rounded to 77_540.106
          "z_score" => 99.0,
          "e_value" => 16.9874,
        },
        "agg_score" => 2_428_411_764.7058825, # previously rounded to  2_428_411_754.8
      }

      expect(JSON.parse(@report)["counts"]["2"]["570"]).to include_json(genus_result)
    end
  end

  context "converted report test for species taxid 1313" do
    before do
      @pipeline_run = create(:pipeline_run,
                             sample: create(:sample, project: create(:project)),
                             total_reads: 1122,
                             adjusted_remaining_reads: 316,
                             subsample: 1_000_000,
                             taxon_counts_data: [{
                               tax_id: 1313,
                               tax_level: 1,
                               taxon_name: "Streptococcus pneumoniae",
                               nr: 2,
                               percent_identity: 96.9,
                               alignment_length: 32.0,
                               e_value: -9.3,
                               genus_taxid: 1301,
                               superkingdom_taxid: 2,
                             }, {
                               tax_id: 1301,
                               tax_level: 2,
                               nr: 2,
                               taxon_name: "Streptococcus",
                               percent_identity: 96.9,
                               alignment_length: 32.0,
                               e_value: -9.3,
                               genus_taxid: 1301,
                               superkingdom_taxid: 2,
                             }, {
                               tax_id: 1301,
                               tax_level: 2,
                               nt: 4,
                               taxon_name: "Streptococcus",
                               percent_identity: 95.65,
                               alignment_length: 149.75,
                               e_value: -81.478,
                               genus_taxid: 1301,
                               superkingdom_taxid: 2,
                             }, {
                               tax_id: 28_037,
                               tax_level: 1,
                               nt: 4,
                               taxon_name: "Streptococcus mitis",
                               percent_identity: 95.65,
                               alignment_length: 149.75,
                               e_value: -81.478,
                               genus_taxid: 1301,
                               superkingdom_taxid: 2,
                             },])

      @background = create(:background,
                           pipeline_run_ids: [
                             create(:pipeline_run,
                                    sample: create(:sample, project: create(:project))).id,
                             create(:pipeline_run,
                                    sample: create(:sample, project: create(:project))).id,
                           ],
                           taxon_summaries_data: [{
                             tax_id: 1313,
                             count_type: "NR",
                             tax_level: 1,
                             mean: 81.3845,
                             stdev: 404.076,
                           }, {
                             tax_id: 1313,
                             count_type: "NT",
                             tax_level: 1,
                             mean: 81.6257,
                             stdev: 442.207,
                           }, {
                             tax_id: 1301,
                             count_type: "NR",
                             tax_level: 2,
                             mean: 201.318,
                             stdev: 942.975,
                           }, {
                             tax_id: 1301,
                             count_type: "NT",
                             tax_level: 2,
                             mean: 290.481,
                             stdev: 1482.97,
                           }, {
                             tax_id: 28_037,
                             count_type: "NR",
                             tax_level: 1,
                             mean: 25.6849,
                             stdev: 139.526,
                           }, {
                             tax_id: 28_037,
                             count_type: "NT",
                             tax_level: 1,
                             mean: 65.9058,
                             stdev: 374.243,
                           },])

      @report = PipelineReportService.call(@pipeline_run.id, @background.id)
    end

    it "should get correct species values" do
      species_result = {
        "genus_tax_id" => 1301,
        "name" => "Streptococcus pneumoniae",
        "nt" => {
          "count" => 0,
          "rpm" => 0,
          "z_score" => -100,
          "e_value" => 0,
        },
        "nr" => {
          "count" => 2,
          "rpm" => 1782.5311942959001, # previously rounded to 1782.531
          "z_score" => 4.209967170274651, # previously rounded to 4.2099668
          "e_value" => 9.3,
        },
        "agg_score" => 12_583.634591815486 # previously rounded to 12_583.63
      }

      expect(JSON.parse(@report)["counts"]["1"]["1313"]).to include_json(species_result)
    end

    it "should get correct genus values" do
      genus_result = {
        "genus_tax_id" => 1301,
        "nt" => {
          "count" => 4.0,
          "rpm" => 3565.0623885918003, # previously rounded to 3565.062
          "z_score" => 2.208123824886411, # previously rounded to 2.2081236
          "e_value" => 81.478,
        },
        "nr" => {
          "count" => 2.0,
          "rpm" => 1782.5311942959001, # previously rounded to 1782.531
          "z_score" => 1.6768346926439197, # previously rounded to 1.6768345
          "e_value" => 9.3,
        },
        "agg_score" => 73_603.80226971892 # previously rounded to 73_603.777
      }

      expect(JSON.parse(@report)["counts"]["2"]["1301"]).to include_json(genus_result)
    end
  end
end
