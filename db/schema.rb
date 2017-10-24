# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20171024234846) do

  create_table "backgrounds", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_backgrounds_on_name", unique: true
  end

  create_table "backgrounds_pipeline_outputs", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.bigint "background_id"
    t.bigint "pipeline_output_id"
    t.index ["background_id"], name: "index_backgrounds_pipeline_outputs_on_background_id"
    t.index ["pipeline_output_id"], name: "index_backgrounds_pipeline_outputs_on_pipeline_output_id"
  end

  create_table "backgrounds_samples", id: false, force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.bigint "background_id", null: false
    t.bigint "sample_id", null: false
    t.index ["background_id"], name: "index_backgrounds_samples_on_background_id"
    t.index ["sample_id"], name: "index_backgrounds_samples_on_sample_id"
  end

  create_table "host_genomes", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "name", null: false
    t.text "s3_star_index_path"
    t.text "s3_bowtie2_index_path"
    t.bigint "default_background_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "input_files", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "name"
    t.text "presigned_url"
    t.bigint "sample_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "source_type", null: false
    t.text "source"
    t.index ["sample_id"], name: "index_input_files_on_sample_id"
  end

  create_table "job_stats", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "task"
    t.integer "reads_before"
    t.integer "reads_after"
    t.bigint "pipeline_output_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["pipeline_output_id"], name: "index_job_stats_on_pipeline_output_id"
    t.index ["task"], name: "index_job_stats_on_task"
  end

  create_table "pipeline_outputs", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.bigint "sample_id", null: false
    t.bigint "total_reads", null: false
    t.bigint "remaining_reads", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "pipeline_run_id"
    t.string "status"
    t.index ["pipeline_run_id"], name: "index_pipeline_outputs_on_pipeline_run_id", unique: true
    t.index ["sample_id"], name: "index_pipeline_outputs_on_sample_id"
  end

  create_table "pipeline_runs", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "job_id"
    t.text "command"
    t.string "command_stdout"
    t.text "command_error"
    t.string "command_status"
    t.bigint "sample_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "pipeline_output_id"
    t.string "job_status"
    t.text "job_description"
    t.string "job_log_id"
    t.index ["job_status"], name: "index_pipeline_runs_on_job_status"
    t.index ["pipeline_output_id"], name: "index_pipeline_runs_on_pipeline_output_id", unique: true
    t.index ["sample_id"], name: "index_pipeline_runs_on_sample_id"
  end

  create_table "postprocess_runs", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "job_id"
    t.text "command"
    t.string "command_stdout"
    t.text "command_error"
    t.string "command_status"
    t.string "job_status"
    t.text "job_description"
    t.string "job_log_id"
    t.bigint "pipeline_output_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["job_status"], name: "index_postprocess_runs_on_job_status"
    t.index ["pipeline_output_id"], name: "index_postprocess_runs_on_pipeline_output_id"
  end

  create_table "projects", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "name", collation: "utf8_general_ci"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_projects_on_name", unique: true
  end

  create_table "projects_users", id: false, force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.bigint "project_id", null: false
    t.bigint "user_id", null: false
    t.index ["project_id"], name: "index_projects_users_on_project_id"
    t.index ["user_id"], name: "index_projects_users_on_user_id"
  end

  create_table "reports", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "name"
    t.bigint "pipeline_output_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "background_id"
    t.index ["background_id"], name: "index_reports_on_background_id"
    t.index ["pipeline_output_id"], name: "index_reports_on_pipeline_output_id"
  end

  create_table "samples", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "name", collation: "utf8_general_ci"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "project_id"
    t.string "status"
    t.string "sample_host"
    t.string "sample_location"
    t.string "sample_date"
    t.string "sample_tissue"
    t.string "sample_template"
    t.string "sample_library"
    t.string "sample_sequencer"
    t.text "sample_notes"
    t.text "s3_preload_result_path"
    t.text "s3_star_index_path"
    t.text "s3_bowtie2_index_path"
    t.integer "sample_memory"
    t.string "job_queue"
    t.bigint "host_genome_id"
    t.index ["project_id", "name"], name: "index_samples_name_project_id", unique: true
  end

  create_table "sequence_locators", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "sequence_file_uri"
    t.bigint "postprocess_run_id"
    t.bigint "pipeline_output_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "hit_type"
    t.index ["pipeline_output_id"], name: "index_sequence_locators_on_pipeline_output_id"
    t.index ["postprocess_run_id"], name: "index_sequence_locators_on_postprocess_run_id"
  end

  create_table "taxon_categories", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.integer "taxid"
    t.string "category"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["taxid"], name: "index_taxon_categories_on_taxid", unique: true
  end

  create_table "taxon_child_parents", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.integer "taxid"
    t.integer "parent_taxid"
    t.string "rank"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["taxid"], name: "index_taxon_child_parents_on_taxid", unique: true
  end

  create_table "taxon_counts", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.bigint "pipeline_output_id"
    t.integer "tax_id"
    t.integer "tax_level"
    t.integer "count"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "name", collation: "utf8_general_ci"
    t.string "count_type"
    t.float "percent_identity", limit: 24
    t.float "alignment_length", limit: 24
    t.float "e_value", limit: 24
    t.index ["pipeline_output_id", "tax_id", "count_type"], name: "new_index_taxon_counts", unique: true
    t.index ["pipeline_output_id", "tax_level", "count_type", "tax_id"], name: "index_taxon_counts", unique: true
    t.index ["pipeline_output_id"], name: "index_taxon_counts_on_pipeline_output_id"
  end

  create_table "taxon_lineage_names", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.integer "taxid"
    t.string "superkingdom_name"
    t.string "phylum_name"
    t.string "class_name"
    t.string "order_name"
    t.string "family_name"
    t.string "genus_name"
    t.string "species_name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["taxid"], name: "index_taxon_lineage_names_on_taxid", unique: true
  end

  create_table "taxon_lineages", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.integer "taxid", null: false
    t.integer "superkingdom_taxid"
    t.integer "phylum_taxid"
    t.integer "class_taxid"
    t.integer "order_taxid"
    t.integer "family_taxid"
    t.integer "genus_taxid"
    t.integer "species_taxid"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "superkingdom_name"
    t.string "phylum_name"
    t.string "class_name"
    t.string "order_name"
    t.string "family_name"
    t.string "genus_name"
    t.string "species_name"
    t.index ["class_taxid"], name: "index_taxon_lineages_on_class_taxid"
    t.index ["family_taxid"], name: "index_taxon_lineages_on_family_taxid"
    t.index ["genus_taxid"], name: "index_taxon_lineages_on_genus_taxid"
    t.index ["order_taxid"], name: "index_taxon_lineages_on_order_taxid"
    t.index ["phylum_taxid"], name: "index_taxon_lineages_on_phylum_taxid"
    t.index ["species_taxid"], name: "index_taxon_lineages_on_species_taxid"
    t.index ["superkingdom_taxid"], name: "index_taxon_lineages_on_superkingdom_taxid"
    t.index ["taxid"], name: "index_taxon_lineages_on_taxid", unique: true
  end

  create_table "taxon_names", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.integer "taxid", null: false
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["taxid"], name: "index_taxon_names_on_taxid", unique: true
  end

  create_table "taxon_sequence_locations", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.integer "taxid"
    t.bigint "sequence_locator_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "first_byte"
    t.bigint "last_byte"
    t.index ["sequence_locator_id"], name: "index_taxon_sequence_locations_on_sequence_locator_id"
  end

  create_table "taxon_summaries", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.bigint "background_id"
    t.integer "tax_id"
    t.string "count_type"
    t.integer "tax_level"
    t.string "name"
    t.float "mean", limit: 24
    t.float "stdev", limit: 24
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["background_id", "count_type", "tax_level", "tax_id"], name: "index_taxon_summaries_detailed", unique: true
    t.index ["background_id"], name: "index_taxon_summaries_on_background_id"
  end

  create_table "taxon_zscores", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.bigint "report_id"
    t.integer "tax_id"
    t.integer "tax_level"
    t.float "zscore", limit: 24
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "name"
    t.float "rpm", limit: 24
    t.string "hit_type"
    t.index ["report_id", "tax_level", "hit_type", "tax_id"], name: "index_taxon_zscores", unique: true
    t.index ["report_id"], name: "index_taxon_zscores_on_report_id"
  end

  create_table "users", force: :cascade, options: "ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci" do |t|
    t.string "email", default: "", null: false, collation: "utf8_general_ci"
    t.string "name", collation: "utf8_general_ci"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "encrypted_password", default: "", null: false, collation: "utf8_general_ci"
    t.string "reset_password_token", collation: "utf8_general_ci"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip", collation: "utf8_general_ci"
    t.string "last_sign_in_ip", collation: "utf8_general_ci"
    t.string "authentication_token", limit: 30, collation: "utf8_general_ci"
    t.integer "role"
    t.index ["authentication_token"], name: "index_users_on_authentication_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "input_files", "samples"
  add_foreign_key "job_stats", "pipeline_outputs"
  add_foreign_key "pipeline_outputs", "samples"
  add_foreign_key "pipeline_runs", "samples"
  add_foreign_key "postprocess_runs", "pipeline_outputs"
  add_foreign_key "reports", "backgrounds"
  add_foreign_key "reports", "pipeline_outputs"
  add_foreign_key "sequence_locators", "pipeline_outputs"
  add_foreign_key "sequence_locators", "postprocess_runs"
  add_foreign_key "taxon_counts", "pipeline_outputs"
  add_foreign_key "taxon_sequence_locations", "sequence_locators"
  add_foreign_key "taxon_summaries", "backgrounds"
  add_foreign_key "taxon_zscores", "reports"
end
