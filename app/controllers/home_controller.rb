require 'will_paginate/array'
class HomeController < ApplicationController
  include SamplesHelper

  def index
    @favorite_projects = current_user.favorites
    render 'home'
  end

  def sort_by(samples, dir = nil)
    default_dir = 'newest'
    dir ||= default_dir
    dir == 'newest' ? samples.order(id: :desc) : samples.order(id: :asc)
  end
end
