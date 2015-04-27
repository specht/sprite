#!/usr/bin/env ruby

require 'digest/sha1'
require 'json'
require 'base64'
require 'fileutils'

response = nil
tag = STDIN.read
path = "autosaves/#{tag}*.hs"
files = Dir[path]
if files.size == 1
    path = files.first
    File::open(path, 'r') do |f|
        response = {'status' => 'success', 'data' => f.read}
    end
else
    response = {'status' => 'error'}
end

response_body = response.to_json
response_str = ''
response_str += "Content-Type: application/json; charset=utf-8\r\n"
response_str += "Content-Length: #{response_body.size}\r\n"
response_str += "\r\n"
response_str += response_body
print(response_str)
exit(0)
