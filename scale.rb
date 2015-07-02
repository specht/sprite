Dir['screenshots/*'].each do |path|
    system("convert #{path} -filter Point -scale 200% scaled/#{File::basename(path)}")
end
