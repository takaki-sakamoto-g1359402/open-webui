# frozen_string_literal: true

require 'httparty'

module ActivityScout
  class Client
    class Error < StandardError; end

    BASE_URI = 'https://www.boredapi.com/api'

    def random_activity
      fetch('/activity')
    end

    def activity_by_type(type)
      if type.nil? || type.strip.empty?
        raise ArgumentError, 'type must be provided'
      end

      fetch('/activity', query: { type: type })
    end

    private

    def fetch(path, query: {})
      response = self.class.get("#{BASE_URI}#{path}", query: query)
      handle_response(response)
    rescue SocketError, Timeout::Error, HTTParty::Error => e
      # Normalize low-level failures so the CLI can present a single error message.
      raise Error, "Network error: #{e.message}"
    end

    def handle_response(response)
      unless response.respond_to?(:code) && response.code.to_i == 200
        raise Error, 'Unexpected response status from activity service'
      end

      body = response.parsed_response
      unless body.is_a?(Hash) && body['activity']
        raise Error, 'Malformed response from activity service'
      end

      if body['error']
        raise Error, body['error']
      end

      {
        activity: body['activity'],
        type: body['type'],
        participants: body['participants'],
        price: body['price']
      }
    end

    class << self
      include HTTParty
    end
  end
end
