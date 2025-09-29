# frozen_string_literal: true

require 'stringio'
require 'activity_scout/cli'

RSpec.describe ActivityScout::CLI do
  let(:output) { StringIO.new }
  let(:client) { instance_double(ActivityScout::Client) }
  subject(:cli) { described_class.new(client: client, output: output) }

  describe '#start' do
    it 'prints help when no command is given' do
      status = cli.start([])

      expect(status).to eq(0)
      expect(output.string).to include('ActivityScout')
    end

    it 'prints a random activity' do
      allow(client).to receive(:random_activity).and_return({ activity: 'Draw a map', type: 'creative', participants: 1, price: 0.2 })

      status = cli.start(['random'])

      expect(status).to eq(0)
      expect(output.string).to include('Activity: Draw a map')
      expect(output.string).to include('Price: 0.20')
    end

    it 'requires a type argument for type command' do
      status = cli.start(['type'])

      expect(status).to eq(1)
      expect(output.string).to include('Usage: activity_scout type <type>')
    end

    it 'prints an activity for a given type' do
      allow(client).to receive(:activity_by_type).with('education').and_return({ activity: 'Learn chess', type: 'education', participants: 2, price: 0.0 })

      status = cli.start(['type', 'education'])

      expect(status).to eq(0)
      expect(output.string).to include('Type: education')
    end

    it 'handles client errors gracefully' do
      allow(client).to receive(:random_activity).and_raise(ActivityScout::Client::Error, 'Something went wrong')

      status = cli.start(['random'])

      expect(status).to eq(1)
      expect(output.string).to include('Error: Something went wrong')
    end

    it 'prints an error for unknown commands' do
      status = cli.start(['unknown'])

      expect(status).to eq(1)
      expect(output.string).to include('Unknown command: unknown')
    end
  end
end
