class LocationsController < ApplicationController
  include LocationHelper

  GEOSEARCH_ERR_MSG = "Unable to perform geosearch".freeze
  LOCATION_LOAD_ERR_MSG = "Unable to load sample locations".freeze

  def external_search
    unless feature_access?
      render(json: {
               status: :unauthorized,
               message: "No feature access"
             }, status: :unauthorized) && return
    end

    results = []
    query = location_params[:query]
    if query.present?
      success, resp = Location.geosearch(query)
      if success
        results = resp.map(&:LocationHelper.adapt_location_iq_response)
      end
    end
    event = MetricUtil::ANALYTICS_EVENT_NAMES[:location_geosearched]
    MetricUtil.log_analytics_event(event, current_user, { query: query }, request)
    render json: results
  rescue => err
    render json: {
      status: "failed",
      message: GEOSEARCH_ERR_MSG,
      errors: [err]
    }, status: :internal_server_error
  end

  def map_playground
    unless feature_access?
      render(json: {
               status: :unauthorized,
               message: "No feature access"
             }, status: :unauthorized) && return
    end

    # Show all viewable locations in a demo format
    field_id = MetadataField.find_by(name: "collection_location").id
    sample_info = current_power.samples
                               .includes(metadata: :metadata_field)
                               .where(metadata: { metadata_field_id: field_id })
                               .pluck(:id, :name, :string_validated_value)
    @results = sample_info.map { |s| { id: s[0], name: s[1], location: s[2] } }

    respond_to do |format|
      format.html { render :map_playground }
      format.json { render json: @results }
    end
  rescue => err
    render json: {
      status: "failed",
      message: LOCATION_LOAD_ERR_MSG,
      errors: [err]
    }, status: :internal_server_error
  end

  private

  def location_params
    params.permit(:query)
  end

  def feature_access?
    current_user.admin? || current_user.allowed_feature_list.include?("maps")
  end
end
