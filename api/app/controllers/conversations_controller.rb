class ConversationsController < ApplicationController
  before_filter :verify_jwt_token

  def index
    @users = User.where.not(id: current_user.id)
    respond_with @users
  end

  def create
    sender    = User.find(params[:sender_id])
    recipient = User.find(params[:recipient_id])

    @conversation = unless Conversation.between(sender.id, recipient.id).empty?
      Conversation.between(sender.id, recipient.id).first
    else
      Conversation.create(sender: sender, recipient: recipient)
    end
    render json: @conversation.to_json
  end
end
