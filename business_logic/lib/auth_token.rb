require 'jwt'

module AuthToken
  def self.issue_token(payload)
    payload['exp'] = 24.hours.from_now.to_i
    JWT.encode(payload, Rails.application.secrets.secret_key_base)
  end

  def self.valid?(token)
    JWT.decode(token, Rails.application.secrets.secret_key_base)
  rescue
    false
  end
end
