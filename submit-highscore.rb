#!/usr/bin/env ruby

require 'digest/sha1'
require 'json'
require 'base64'
require 'fileutils'

FileUtils::mkdir('scores') unless File::directory?('scores')

response = nil
data = STDIN.read(100)
data = JSON.parse(data)
tag = data['tag']

if tag =~ /^[0-9a-f]{1,40}$/ && (!data['name'].strip.empty?)
    path = "autosaves/#{tag}*.hs"
    files = Dir[path]
    if files.size == 1
        score_path = "scores/#{tag}.json"
        scores = []
        if File::exists?(score_path)
            scores = JSON.parse(File::read(score_path, :encoding => 'utf-8'))
        end
        p = 0
        while p < scores.size && scores[p]['points'] >= data['points']
            p += 1
        end
        scores.insert(p, {'name' => data['name'][0, 20], 'points' => data['points']})
        scores = scores[0, 10]
        File::open(score_path, 'w') { |f| f.write(scores.to_json) }
        response = {'status' => 'success', 'data' => {'scores' => scores}}
    else
        response = {'status' => 'error'}
    end
end

if response
    response_body = response.to_json
    response_str = ''
    response_str += "Content-Type: application/json; charset=utf-8\r\n"
    response_str += "Content-Length: #{response_body.bytesize}\r\n"
    response_str += "\r\n"
    response_str += response_body
    print(response_str)
end
exit(0)
