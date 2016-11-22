#!/usr/bin/env ruby

require 'digest/sha1'
require 'json'
require 'base64'
require 'fileutils'
require 'stringio'
require 'yaml'
require 'zip'

files = []

Dir["autosaves/*.hs"].sort do |a, b|
    File::mtime(b) <=> File::mtime(a)
end.each do |path|
    begin
        tag = File::basename(path).sub('.hs', '')
        game_title = '(unbekannt)'
        game_author = '(unbekannt)'
        entry = {}
        if File::exists?("cache/#{tag}.json")
            File::open("cache/#{tag}.json", 'r') do |f|
                entry = JSON.parse(f.read())
            end
        else
            data = Base64.decode64(File::read(path))
            Zip::File.open_buffer(data) do |archive|
                archive.each do |entry|
                    if entry.name == 'game.json'
                        begin
                            game_json = entry.get_input_stream.read.force_encoding('UTF-8')
                            game = JSON.parse(game_json)
                            game_title = game['game_title']
                            game_author = game['game_author']
                            game_title.encode!('UTF-8', 'binary', invalid: :replace, undef: :replace, replace: '')
                            game_author.encode!('UTF-8', 'binary', invalid: :replace, undef: :replace, replace: '')
                        rescue ArgumentError
                        end
                    end
                end
            end
            entry = {
                :game_title => game_title,
                :game_author => game_author
            }
            File::open("cache/#{tag}.json", 'w') do |f|
                f.write entry.to_json
            end
        end
        entry[:tag] = tag
        entry[:mtime] = File::mtime(path)
        files << entry
    rescue StandardError => e
    end
end

response = {:files => files}

response_body = response.to_json
response_str = ''
response_str += "Content-Type: application/json; charset=utf-8\r\n"
response_str += "Content-Length: #{response_body.bytesize}\r\n"
response_str += "\r\n"
response_str += response_body
print(response_str)
exit(0)
