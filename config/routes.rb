require 'resque/server'

Rails.application.routes.draw do
  resources :backgrounds
  resources :reports
  resources :pipeline_outputs
  devise_for :users
  resources :samples do
    put :reupload_source, on: :member
    put :kickoff_pipeline, on: :member
  end
  resources :projects
  resources :users
  mount Resque::Server.new, at: '/resque'
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
  root to: 'home#home'
end
