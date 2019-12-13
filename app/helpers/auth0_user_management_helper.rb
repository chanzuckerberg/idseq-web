module Auth0UserManagementHelper
  AUTH0_CONNECTION_NAME = ENV["AUTH0_CONNECTION"] || "Username-Password-Authentication"

  # Create a new user in the Auth0 user database.
  # This method creates the user only in the main user database (Username-Password-Authentication)
  def self.create_auth0_user(email:, name:, password:, role: User::ROLE_REGULAR_USER)
    options = {
      connection: AUTH0_CONNECTION_NAME,
      email: email,
      name: name,
      password: password,
      app_metadata: { roles: role == User::ROLE_ADMIN ? ['admin'] : [] },
    }
    # See:
    # - https://auth0.com/docs/api/management/v2#!/Users/post_users
    # - https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/v2/users.rb
    create_response = auth0_management_client.create_user(name, options)
    add_role_to_auth0_user(auth0_user_id: create_response["user_id"], role: role)
    create_response
  end

  # Delete users from Auth0 database based on the email.
  # This method will delete users that match this email in all auth0 connections
  def self.delete_auth0_user(email:)
    auth0_user_ids = get_auth0_user_ids_by_email(email)
    auth0_user_ids.each do |auth0_user_id|
      # See:
      # - https://auth0.com/docs/api/management/v2#!/Users/delete_users_by_id
      # - https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/v2/users.rb
      auth0_management_client.delete_user(auth0_user_id)
    end
  end

  # Get auth0 user ids based on the email
  # This method will fetch all auth0 connections (ex: idseq-legacy-users and Username-Password-Authentication) to retrieve these ids
  def self.get_auth0_user_ids_by_email(email)
    # See:
    # - https://auth0.com/docs/api/management/v2#!/Users_By_Email/get_users_by_email
    # - https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/v2/users_by_email.rb
    auth0_users = auth0_management_client.users_by_email(email, fields: "identities")
    (auth0_users.map { |u| u["identities"].map { |i| i.values_at("provider", "user_id").join("|") } }).flatten
  end

  private_class_method def self.add_role_to_auth0_user(auth0_user_id:, role: User::ROLE_REGULAR_USER)
    auth0_roles = auth0_management_client.get_roles
    auth0_admin_role = (auth0_roles.find { |r| r["name"] == "Admin" })["id"]
    if role == User::ROLE_ADMIN
      # See:
      # - https://auth0.com/docs/api/management/v2#!/Users/post_user_roles
      # - https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/v2/users.rb
      auth0_management_client.add_user_roles(auth0_user_id, [auth0_admin_role])
    else
      # See:
      # - https://auth0.com/docs/api/management/v2#!/Users/delete_user_roles
      # - https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/v2/users.rb
      auth0_management_client.remove_user_roles(auth0_user_id, [auth0_admin_role])
    end
  end

  # Patch user fields in Auth0 database.
  # This method will patch users that match this email in all auth0 connections
  def self.patch_auth0_user(email:, name:, role:)
    auth0_user_ids = get_auth0_user_ids_by_email(email)
    auth0_user_ids.each do |auth0_user_id|
      if name.present?
        body = { name: name, app_metadata: { roles: role == User::ROLE_ADMIN ? ['admin'] : [] } }
        # See:
        # - https://auth0.com/docs/api/management/v2#!/Users/patch_users_by_id
        # - https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/v2/users.rb
        auth0_management_client.patch_user(auth0_user_id, body)
      end
      add_role_to_auth0_user(auth0_user_id: auth0_user_id, role: role)
    end
  end

  def self.get_auth0_password_reset_token(auth0_id)
    # See: https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/v2/tickets.rb
    auth0_management_client.post_password_change(user_id: auth0_id)
  end

  def self.send_auth0_password_reset_email(email)
    # Change with empty password triggers reset email.
    # See: https://github.com/auth0/ruby-auth0/blob/master/lib/auth0/api/authentication_endpoints.rb
    auth0_management_client.change_password(email, "", ENV["AUTH0_CONNECTION"])
  end

  # Set up Auth0 management client for actions like adding users.
  def self.auth0_management_client
    # See: https://github.com/auth0/ruby-auth0/blob/master/README.md#management-api-v2
    @auth0_management_client ||= Auth0Client.new(
      client_id: ENV["AUTH0_MANAGEMENT_CLIENT_ID"],
      client_secret: ENV["AUTH0_MANAGEMENT_CLIENT_SECRET"],
      domain: ENV["AUTH0_MANAGEMENT_DOMAIN"],
      api_version: 2
    )
  end
end
