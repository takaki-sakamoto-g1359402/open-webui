# frozen_string_literal: true

require_relative 'client'

module ActivityScout
  class CLI
    def initialize(client: Client.new, output: $stdout)
      @client = client
      @output = output
    end

    def start(args)
      command = args.shift

      case command
      when 'random'
        print_activity(client.random_activity)
        0
      when 'type'
        type = args.shift
        unless type
          output.puts('Usage: activity_scout type <type>')
          return 1
        end

        print_activity(client.activity_by_type(type))
        0
      when nil, 'help'
        output.puts(help_text)
        0
      else
        output.puts("Unknown command: #{command}")
        output.puts(help_text)
        1
      end
    rescue Client::Error => e
      output.puts("Error: #{e.message}")
      1
    rescue ArgumentError => e
      output.puts("Error: #{e.message}")
      1
    end

    private

    attr_reader :client, :output

    def print_activity(activity)
      output.puts("Activity: #{activity[:activity]}")
      output.puts("Type: #{activity[:type]}") if activity[:type]
      output.puts("Participants: #{activity[:participants]}") if activity.key?(:participants)
      if activity.key?(:price)
        output.puts("Price: #{format('%.2f', activity[:price])}")
      end
    end

    def help_text
      <<~TEXT
        ActivityScout - discover a quick activity suggestion

        Commands:
          random              Fetch a random activity suggestion
          type <type>        Fetch an activity filtered by type (e.g., education)
          help               Show this help message
      TEXT
    end
  end
end
