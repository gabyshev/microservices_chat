class ConversationsController < ApplicationController
  before_filter :verify_jwt_token

  def index
    @users = User.where.not(id: current_user.id)
    respond_with @users
  end
end
