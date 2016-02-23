class ApiController < ApplicationController
  before_filter :verify_jwt_token

  def test
    render json: {'sample' => 'data'}
  end
end
