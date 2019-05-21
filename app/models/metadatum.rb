require 'csv'
require 'elasticsearch/model'

class Metadatum < ApplicationRecord
  include ErrorHelper
  include DateHelper

  if ELASTICSEARCH_ON
    include Elasticsearch::Model
    include Elasticsearch::Model::Callbacks
  end

  Client = Aws::S3::Client.new

  # ActiveRecord related
  belongs_to :sample
  belongs_to :metadata_field
  STRING_TYPE = 0
  NUMBER_TYPE = 1
  DATE_TYPE = 2
  LOCATION_TYPE = 3

  # Validations
  validates :string_validated_value, length: { maximum: 250 }
  validates :number_validated_value, numericality: true, allow_nil: true
  validate :set_validated_values

  # Additional ActiveRecord field documentation:
  #
  # For things like location/date we should try to have a consistent pattern. This is the
  # "explicitly-specifying levels of things" option vs. the reverse option of "freeform fields and
  # then inferring the level of specificity from the values".
  # t.string :specificity
  #
  # Every piece of metadata will belong to a type of metadata_field
  # add_reference :metadata, :metadata_field

  # Custom validator called on save or update. Writes to the *_validated_value column.
  def set_validated_values
    # Fail if sample resolves to nil (probably a deleted sample)
    # TODO: Replace this with MetadataField validators
    unless sample
      errors.add(:sample_not_found, MetadataValidationErrors::SAMPLE_NOT_FOUND)
      return
    end

    # Check if the key is valid. Metadata_field was supposed to be set.
    valid_keys = sample.host_genome.metadata_fields.pluck(:name, :display_name).flatten
    unless key && valid_keys.include?(key) && metadata_field
      errors.add(:invalid_field_for_host_genome, MetadataValidationErrors::INVALID_FIELD_FOR_HOST_GENOME)
      return
    end

    base = self.class.convert_type_to_string(metadata_field.base_type)
    public_send("check_and_set_#{base}_type")
  end

  # Called by set_validated_values custom validator
  def check_and_set_string_type
    if metadata_field && metadata_field.force_options == 1
      matched = false
      JSON.parse(metadata_field.options || "[]").each do |opt|
        if Metadatum.str_to_basic_chars(raw_value) == Metadatum.str_to_basic_chars(opt)
          # Ex: Match 'neb ultra-iifs dna' to 'NEB Ultra II FS DNA'
          # Ex: Match '30-day mortality' to "30 Day Mortality"
          self.string_validated_value = opt
          matched = true
          break
        end
      end
      unless matched
        errors.add(:raw_value, MetadataValidationErrors::INVALID_OPTION)
      end
    else
      self.string_validated_value = raw_value
    end
  end

  def check_and_set_number_type
    # If the raw-value doesn't match a number regex.
    # This regex matches things like +0.2. Plus or minus, one or more digits, an optional decimal, and more digits.
    if /\A[+-]?\d+(\.\d+)?\z/.match(raw_value).nil?
      errors.add(:raw_value, MetadataValidationErrors::INVALID_NUMBER)
    else
      # to_d will convert "abc" to 0.0, so we need the regex
      val = raw_value.to_d
      # Larger numbers will cause mysql error.
      if val >= (10**27) || val <= (-10**27)
        errors.add(:raw_value, MetadataValidationErrors::NUMBER_OUT_OF_RANGE)
      else
        self.number_validated_value = val
      end
    end
  rescue ArgumentError
    errors.add(:raw_value, MetadataValidationErrors::INVALID_NUMBER)
  end

  def check_and_set_date_type
    # Only allow day in the date if host genome is not Human.
    self.date_validated_value = parse_date(raw_value, sample.host_genome_name != "Human")
  rescue ArgumentError
    errors.add(:raw_value, MetadataValidationErrors::INVALID_DATE)
  end

  def check_and_set_location_type
    # Skip if location was already resolved
    return if location_id && !raw_value

    # Based on our metadata structure, the location details selected by the user will end up in
    # raw_value.
    loc = JSON.parse(raw_value, symbolize_names: true)

    # If they submitted plain text, don't use a Location object but set string_validated_value.
    unless loc[:locationiq_id]
      self.string_validated_value = loc[:name]
      self.location_id = nil
      return
    end

    # Set to existing Location or create a new one based on the external IDs. For the sake of not
    # trusting user input, we'll potentially re-fetch location details based on the API and OSM IDs.
    result = Location.find_or_create_by_api_ids(loc[:locationiq_id], loc[:osm_id], loc[:osm_type])
    # At this point, discard raw_value (too long to store anyway)
    self.raw_value = nil
    self.location_id = result.id
  rescue
    errors.add(:raw_value, MetadataValidationErrors::INVALID_LOCATION)
  end

  def self.str_to_basic_chars(res)
    res.downcase.gsub(/[^0-9A-Za-z]/, '')
  end

  # Load bulk metadata from a CSV file from S3
  def self.bulk_load_from_s3_csv(path)
    csv_data = get_s3_csv(path)
    to_create, errors = bulk_load_prepare(csv_data)
    errors += bulk_load_import(to_create)
    bulk_log_errors(errors)
  end

  # Construct objects to create without saving.
  def self.bulk_load_prepare(csv_data)
    to_create = []
    errors = []
    csv_data.each_with_index do |row, index|
      begin
        to_create += load_csv_single_sample_row(row, index)
      rescue => err
        # Catch ArgumentError for proj and sample, other errors
        errors << err.message
      end
    end
    [to_create, errors]
  end

  # Create the object instances with activerecord-import. Still uses the
  # validations.
  def self.bulk_load_import(to_create)
    errors = []
    begin
      # The unique key is on sample and metadata.key, so the value fields will
      # be updated if the key exists.
      update_keys = [:raw_value, :string_validated_value, :number_validated_value, :date_validated_value]
      results = Metadatum.import to_create, on_duplicate_key_update: update_keys
      results.failed_instances.each do |model|
        # Show the errors from ActiveRecord
        msg = model.errors.full_messages[0]
        errors << "#{model.key}: #{msg}"
      end
    rescue => err
      # Record other errors
      errors << err.message
    end
    errors
  end

  def self.bulk_log_errors(errors)
    unless errors.empty?
      msg = errors.join(".\n")
      Rails.logger.error(msg)
      errors
    end
  end

  # Load CSV file from S3. Raise RuntimeError on download fail.
  def self.get_s3_csv(path)
    parts = path.split("/", 4)
    bucket = parts[2]
    key = parts[3]
    begin
      resp = Client.get_object(bucket: bucket, key: key)
      csv_data = resp.body.read
    rescue => err
      raise "Error in loading S3 file. #{err.message}"
    end

    # Remove BOM if present (file likely comes from Excel)
    csv_data = csv_data.delete("\uFEFF")
    csv_data = CSV.parse(csv_data, headers: true)
    csv_data
  end

  # Load metadata from a single CSV row corresponding to one sample.
  # Return the Metadatum to create without saving.
  def self.load_csv_single_sample_row(row, index)
    # Setup
    to_create = []
    row = row.to_h
    proj = load_csv_project(row, index)
    sample = load_csv_sample(row, index, proj)

    # Add or update Metadata items
    done_keys = [:study_id, :project_name, :sample_name]
    row.each do |key, value|
      next unless key && value
      # Strip whitespace and ensure symbol
      key = key.to_s.strip.to_sym
      next if done_keys.include?(key)
      to_create << new_without_save(sample, key, value)
    end

    to_create
  end

  # Get the project for the CSV row
  def self.load_csv_project(row, index)
    proj_name = row['study_id'] || row['project_name']
    unless proj_name
      raise ArgumentError, "No project name found in row #{index + 2}"
    end
    proj = Project.find_by(name: proj_name)
    unless proj
      raise ArgumentError, "No project found named #{proj_name}"
    end
    proj
  end

  # Get the sample for the CSV row
  def self.load_csv_sample(row, index, proj)
    sample_name = row['sample_name']
    unless sample_name
      raise ArgumentError, "No sample name found in row #{index + 2}"
    end
    sample = Sample.find_by(project: proj, name: sample_name)
    unless sample
      raise ArgumentError, "No sample found named #{sample_name} in #{proj.name}"
    end
    sample
  end

  # Make a new Metadatum instance without saving/creating.
  def self.new_without_save(sample, key, value)
    key = key.to_sym
    m = Metadatum.new
    m.metadata_field = MetadataField.find_by(name: key) || MetadataField.find_by(display_name: key)
    m.key = m.metadata_field ? m.metadata_field.name : nil
    m.raw_value = value.is_a?(ActionController::Parameters) ? value.to_json : value
    # *_validated_value field is set in the set_validated_values validator.
    m.sample = sample
    m
  end

  def validated_value
    base = self.class.convert_type_to_string(metadata_field.base_type)
    return self["#{base}_validated_value"]
  rescue
    ""
  end

  def validated_field
    base = self.class.convert_type_to_string(metadata_field.base_type)
    return "#{base}_validated_value"
  end

  def self.validated_value_multiget(metadata)
    metadata_fields = MetadataField.where(id: metadata.pluck(:metadata_field_id)).index_by(&:id)
    validated_values = {}
    metadata.each do |md|
      mdf = metadata_fields[md.metadata_field_id]
      if mdf
        base = convert_type_to_string(mdf.base_type)
        validated_values[md.id] = md["#{base}_validated_value"]
      else
        validated_values[md.id] = ""
      end
    end
    validated_values
  end

  def self.convert_type_to_string(type)
    if type == STRING_TYPE
      return "string"
    elsif type == NUMBER_TYPE
      return "number"
    elsif type == DATE_TYPE
      return "date"
    elsif type == LOCATION_TYPE
      return "location"
    end
    ""
  end
end
