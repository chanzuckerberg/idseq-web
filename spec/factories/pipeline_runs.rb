FactoryBot.define do
  factory :pipeline_run, class: PipelineRun do
    transient do
      # Arrays of entries to create for their respective properties:
      # taxon_counts, amr_counts, output_states, pipeline_run_stage
      # The hash elements will be passed on to their respective factory as keyword arguments.
      taxon_counts_data { [] }
      amr_counts_data { [] }
      output_states_data { [] }
      pipeline_run_stages_data { [] }
    end

    alignment_config { create(:alignment_config) }

    after :create do |pipeline_run, options|
      options.taxon_counts_data.each do |taxon_count_data|
        create(:taxon_count, pipeline_run: pipeline_run, **taxon_count_data)
      end
      options.amr_counts_data.each do |amr_count_data|
        create(:amr_count, pipeline_run: pipeline_run, **amr_count_data)
      end
      options.output_states_data.each do |output_states_data|
        pipeline_run.output_states.find_by(output: output_states_data[:output]).update(state: output_states_data[:state])
      end
      pipeline_run.pipeline_run_stages = []
      options.pipeline_run_stages_data.each do |pipeline_run_stage_data|
        create(:pipeline_run_stage, pipeline_run: pipeline_run, **pipeline_run_stage_data)
      end
    end
  end
end
