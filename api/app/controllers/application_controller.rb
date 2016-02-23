require 'auth_token'
class ApplicationController < ActionController::Base
  skip_before_action :verify_authenticity_token
  respond_to :json

  protected

  def verify_jwt_token
    return head :unauthorized if auth_headers.nil? || !AuthToken.valid?(provided_token)
    sign_in(:user, User.find_by(email: provided_email))
  end

  def auth_headers
    request.headers['Authorization']
  end

  def provided_token
    auth_headers.split(' ')[-1]
  end

  def provided_email
    auth_headers.split(' ')[-2]
  end
end
