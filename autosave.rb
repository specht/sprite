#!/usr/bin/env ruby

require 'digest/sha1'
require 'json'
require 'base64'
require 'fileutils'

message = STDIN.read
tag = Digest::SHA1.hexdigest(message)
begin
    FileUtils::mkdir("autosaves")
rescue Errno::EEXIST
end
unless File::exists?("autosaves/#{tag}.hs")
    File::open("autosaves/#{tag}.hs", 'w') do |f|
        f.write(message)
    end
end
response = {'status' => 'stored', 'timestamp' => Time.now.to_i, 'body_length' => message.size, 'tag' => tag}

response_body = response.to_json
response_str = ''
response_str += "Content-Type: application/json; charset=utf-8\r\n"
response_str += "Content-Length: #{response_body.bytesize}\r\n"
response_str += "\r\n"
response_str += response_body
print(response_str)
exit(0)
