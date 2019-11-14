require 'elasticsearch/model'
require 'auth0'

class User < ApplicationRecord
  if ELASTICSEARCH_ON
    include Elasticsearch::Model
    include Elasticsearch::Model::Callbacks
  end

  before_save :ensure_authentication_token

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable, :registerable
  devise :database_authenticatable, :recoverable,
         :rememberable, :trackable, :validatable

  # NOTE: counter_cache is not supported for has_and_belongs_to_many.
  has_and_belongs_to_many :projects
  # All one-to-many assocs are counter cached for per-user analytics.
  # See traits_for_segment.
  has_many :samples, dependent: :destroy
  has_many :favorite_projects, dependent: :destroy
  has_many :favorites, through: :favorite_projects, source: :project, dependent: :destroy
  has_many :visualizations, dependent: :destroy
  has_many :phylo_trees, dependent: :destroy
  has_many :backgrounds, dependent: :destroy
  has_many :bulk_downloads, dependent: :destroy

  validates :email, presence: true
  validates :name, presence: true, format: {
    # See https://www.ascii-code.com/. These were the ranges that captured the
    # common accented chars I knew from experience, leaving out pure symbols.
    with: /\A[- 'a-zA-ZÀ-ÖØ-öø-ÿ]+\z/, message: "Name must contain only letters, apostrophes, dashes or spaces",
  }
  attr_accessor :email_arguments
  ROLE_ADMIN = 1
  DEMO_USER_EMAILS = ['idseq.guest@chanzuckerberg.com'].freeze
  IDSEQ_BUCKET_PREFIXES = ['idseq-'].freeze
  CZBIOHUB_BUCKET_PREFIXES = ['czb-', 'czbiohub-'].freeze

  def as_json(options = {})
    super({ except: [:authentication_token], methods: [:admin] }.merge(options))
  end

  def admin
    role == ROLE_ADMIN
  end

  def admin?
    admin
  end

  def role_name
    admin? ? 'admin user' : 'non-admin user'
  end

  def allowed_feature_list
    JSON.parse(allowed_features || "[]")
  end

  def allowed_feature?(feature)
    allowed_feature_list.include?(feature)
  end

  def add_allowed_feature(feature)
    parsed_allowed_features = allowed_feature_list

    unless parsed_allowed_features.include?(feature)
      update(allowed_features: parsed_allowed_features + [feature])
    end
  end

  def remove_allowed_feature(feature)
    parsed_allowed_features = allowed_feature_list

    if parsed_allowed_features.include?(feature)
      update(allowed_features: parsed_allowed_features - [feature])
    end
  end

  # This method is for tracking purposes only, not security.
  def demo_user?
    DEMO_USER_EMAILS.include?(email)
  end

  def can_upload(s3_path)
    return true if admin?

    user_bucket = s3_path.split("/")[2] # get "bucket" from "s3://bucket/path/to/file"

    # Don't allow any users to upload from idseq buckets
    return false if user_bucket.nil? || user_bucket == SAMPLES_BUCKET_NAME || IDSEQ_BUCKET_PREFIXES.any? { |prefix| user_bucket.downcase.starts_with?(prefix) }

    # Don't allow any non-Biohub users to upload from czbiohub buckets
    if CZBIOHUB_BUCKET_PREFIXES.any? { |prefix| user_bucket.downcase.starts_with?(prefix) }
      unless biohub_s3_upload_enabled?
        return false
      end
    end

    true
  end

  # This method is for tracking purposes only, not security.
  def biohub_user?
    ["czbiohub.org", "ucsf.edu"].include?(email.split("@").last)
  end

  def biohub_s3_upload_enabled?
    biohub_user? || allowed_feature_list.include?("biohub_s3_upload_enabled") || admin?
  end

  # This method is for tracking purposes only, not security.
  def czi_user?
    domain = email.split("@").last
    domain == "chanzuckerberg.com" || domain.ends_with?(".chanzuckerberg.com")
  end

  # "Greg  L.  Dingle" -> "Greg L."
  def first_name
    name.split[0..-2].join " "
  end

  # "Greg  L.  Dingle" -> "Dingle"
  def last_name
    name.split[-1]
  end

  def owns_project?(project_id)
    projects.exists?(project_id)
  end

  # This returns a hash of interesting optional data for Segment user tracking.
  # Make sure you use any reserved names as intended by Segment!
  # See https://segment.com/docs/spec/identify/#traits .
  def traits_for_segment
    {
      # DB fields
      email: email,
      name: name,
      created_at: created_at,
      updated_at: updated_at,
      role: role,
      allowed_features: allowed_feature_list,
      institution: institution,
      # Derived fields
      admin: admin?,
      demo_user: demo_user?,
      biohub_user: biohub_user?,
      czi_user: czi_user?,
      # Counts (should be cached in the users table for perf)
      projects: projects.size, # projects counter is NOT cached because has_and_belongs_to_many
      samples: samples.size,
      favorite_projects: favorite_projects.size,
      favorites: favorites.size,
      visualizations: visualizations.size,
      phylo_trees: phylo_trees.size,
      # Has-some (this is important for Google Custom Dimensions, which require
      # categorical values--there is no way to derive them from raw counts.) See
      # https://segment.com/docs/destinations/google-analytics/#custom-dimensions
      has_projects: !projects.empty?,
      has_samples: !samples.empty?,
      has_favorite_projects: !favorite_projects.empty?,
      has_favorites: !favorites.empty?,
      has_visualizations: !visualizations.empty?,
      has_phylo_trees: !phylo_trees.empty?,
      # Segment special fields
      createdAt: created_at.iso8601, # currently same as created_at
      firstName: first_name,
      lastName: last_name,
      # Devise fields
      sign_in_count: sign_in_count,
      current_sign_in_at: current_sign_in_at,
      last_sign_in_at: last_sign_in_at,
      current_sign_in_ip: current_sign_in_ip,
      last_sign_in_ip: last_sign_in_ip,
      # TODO: (gdingle): get more useful data on signup
      # title, phone, website, address, company
    }
  end

  # Create a new user in the Auth0 database.
  # See:
  # - https://auth0.com/docs/api/management/v2#!/Users/post_users
  # - https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/v2/users.rb
  def self.create_auth0_user(params)
    connection = ENV["AUTH0_CONNECTION"]
    email = params[:email]
    name = params[:name]
    password = params[:password]
    options = {
      connection: connection,
      email: email,
      name: name,
      password: password,
    }
    auth0_management_client.create_user(name, options)
  end

  # See: https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/v2/tickets.rb
  def self.get_auth0_password_reset_token(auth0_id)
    auth0_management_client.post_password_change(user_id: auth0_id)
  end

  # See: https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/authentication_endpoints.rb
  def self.send_auth0_password_reset_email(email)
    # Change with empty password triggers reset email.
    connection = ENV["AUTH0_CONNECTION"]
    auth0_management_client.change_password(email, "", connection)
  end

  private

  # Copied from https://gist.github.com/josevalim/fb706b1e933ef01e4fb6
  def ensure_authentication_token
    if authentication_token.blank?
      self.authentication_token = generate_authentication_token
    end
  end

  def generate_authentication_token
    loop do
      token = Devise.friendly_token
      break token unless User.find_by(authentication_token: token)
    end
  end

  # Set up Auth0 management client for actions like adding users.
  # See: https://github.com/auth0/ruby-auth0/blob/master/README.md#management-api-v2
  private_class_method def self.auth0_management_client
    @auth0_management_client ||= Auth0Client.new(
      client_id: ENV["AUTH0_MANAGEMENT_CLIENT_ID"],
      client_secret: ENV["AUTH0_MANAGEMENT_CLIENT_SECRET"],
      domain: ENV["AUTH0_DOMAIN"],
      api_version: 2
    )
  end
end
