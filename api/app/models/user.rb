class User < ActiveRecord::Base
  devise :database_authenticatable, :registerable, :validatable

  has_many :conversations, foreign_key: :sender_id
end
