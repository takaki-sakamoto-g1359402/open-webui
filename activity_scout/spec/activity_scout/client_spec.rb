# frozen_string_literal: true

require 'activity_scout/client'

RSpec.describe ActivityScout::Client do
  subject(:client) { described_class.new }

  describe '#random_activity' do
    it 'returns parsed activity data on success' do
      body = { 'activity' => 'Take a walk', 'type' => 'recreational', 'participants' => 1, 'price' => 0.0 }
      response = instance_double('HTTParty::Response', code: 200, parsed_response: body)
      allow(described_class).to receive(:get).and_return(response)

      result = client.random_activity

      expect(result).to eq({ activity: 'Take a walk', type: 'recreational', participants: 1, price: 0.0 })
    end

    it 'raises an error when the service returns a non-200 status' do
      response = instance_double('HTTParty::Response', code: 500, parsed_response: {})
      allow(described_class).to receive(:get).and_return(response)

      expect { client.random_activity }.to raise_error(described_class::Error, /Unexpected response status/)
    end
  end

  describe '#activity_by_type' do
    it 'requires a type argument' do
      expect { client.activity_by_type(nil) }.to raise_error(ArgumentError)
    end

    it 'returns data when the type is provided' do
      body = { 'activity' => 'Learn Ruby', 'type' => 'education', 'participants' => 1, 'price' => 0.1 }
      response = instance_double('HTTParty::Response', code: 200, parsed_response: body)
      allow(described_class).to receive(:get).and_return(response)

      result = client.activity_by_type('education')

      expect(result).to include(activity: 'Learn Ruby', type: 'education')
    end

    it 'raises an error when the API returns an error message' do
      body = { 'error' => 'No activity found' }
      response = instance_double('HTTParty::Response', code: 200, parsed_response: body)
      allow(described_class).to receive(:get).and_return(response)

      expect { client.activity_by_type('music') }.to raise_error(described_class::Error, 'No activity found')
    end
  end

  describe 'network failures' do
    it 'wraps HTTParty errors' do
      allow(described_class).to receive(:get).and_raise(HTTParty::Error.new('oops'))

      expect { client.random_activity }.to raise_error(described_class::Error, /Network error/)
    end
  end
end
