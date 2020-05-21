require 'elasticsearch/model'

# Provides Async Callbacks for Elasticsearch Syncing
module ElasticsearchCallbacksHelper
  include Elasticsearch::Model

  def self.included(base)
    return unless base.ancestors.include?(::ActiveRecord::Base)
    base.class_eval do
      after_commit -> { async_elasticsearch_index }, on: :create
      after_commit -> { async_elasticsearch_index }, on: :update
      after_commit -> { async_elasticsearch_delete }, on: :destroy
    end
  end

  def async_elasticsearch_index
    Resque.enqueue(
      ElasticsearchIndex,
      :index,
      index_name,
      document_type,
      id,
      __elasticsearch__.as_indexed_json
    )
  end

  def async_elasticsearch_delete
    Resque.enqueue(
      ElasticsearchIndex,
      :index,
      index_name,
      document_type,
      id,
      __elasticsearch__.as_indexed_json
    )
  end
end
