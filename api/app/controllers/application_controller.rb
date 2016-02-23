require 'auth_token'
class ApplicationController < ActionController::Base
  skip_before_action :verify_authenticity_token
  respond_to :json

  protected

  def verify_jwt_token
    head :unauthorized if auth_headers.nil? || !AuthToken.valid?(auth_headers.split(' ').last)
  end

  def auth_headers
    request.headers['Authorization']
  end
end
