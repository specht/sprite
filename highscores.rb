#!/usr/bin/env ruby

require 'digest/sha1'
require 'json'
require 'base64'
require 'fileutils'

response = nil
tag = STDIN.read(40)
if tag =~ /^[0-9a-f]{1,40}$/
    path = "autosaves/#{tag}*.hs"
    files = Dir[path]
    scores = []
    if files.size == 1
        score_path = "scores/#{tag}.json"
        if File::exists?(score_path)
            scores = JSON.parse(File::read(score_path, :encoding => 'utf-8'))
        end
    end
    while scores.size < 10
        scores << {'name' => '&ndash;', 'points' => '&ndash;'}
    end
    response = {'status' => 'success', 'data' => scores}
end

if response
    response_body = response.to_json #.force_encoding('utf-8')
    response_str = ''
    response_str += "Content-Type: application/json; charset=utf-8\r\n"
    response_str += "Content-Length: #{response_body.bytesize}\r\n"
    response_str += "\r\n"
    response_str += response_body
    print(response_str)
end
exit(0)
