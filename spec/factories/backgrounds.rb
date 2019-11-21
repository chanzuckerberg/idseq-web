FactoryBot.define do
  factory :background do
    sequence(:name) { |n| "Background #{n}" }
    pipeline_run_ids { [] }
    ready { 1 }

    transient do
      taxon_summaries_data { [] }
    end

    before :create do |background, options|
      options.taxon_summaries_data.each do |taxon_summary_data|
        create(:taxon_summary, background: background, **taxon_summary_data)
      end
    end
  end
end
