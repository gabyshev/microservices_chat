class MessagesController < ApplicationController
  before_filter :verify_jwt_token

  def index
    render json: {}, status: :not_found unless conversation
    @messages = conversation.messages

    render json: @messages.map{ |m| { body: m.body, from: m.user.email }}
  end

  def create
    @message = conversation.messages.create(message_params)
    render json: @message.to_json
  end

  private

  def conversation
    @conversation = Conversation.find(params[:conversation_id])
  end

  def message_params
    params.require(:message).permit(:body, :user_id)
  end
end
