pipeline {
    agent any

    stages {

        stage('Pull Latest Code') {
            steps {
                sh '''
                cd /home/Kelompok8/SIPETA_WEB

                git pull origin main
                '''
            }
        }

        stage('Build Backend') {
            steps {
                sh '''
                cd /home/Kelompok8/SIPETA_WEB

                docker build --no-cache -t sipeta-backend:latest ./sipeta-backend
                '''
            }
        }

        stage('Build Frontend') {
            steps {
                sh '''
                cd /home/Kelompok8/SIPETA_WEB

                docker build --no-cache -t sipeta-frontend:latest ./sipeta-frontend
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                cd /home/Kelompok8/SIPETA_WEB

                docker stack deploy -c docker-compose.yml sipeta

                docker service update --force sipeta_backend
                docker service update --force sipeta_frontend
                '''
            }
        }

        stage('Verify Services') {
            steps {
                sh '''
                docker service ls
                '''
            }
        }

    post {

        success {
            echo 'SIPETA deployed successfully'
        }

        failure {
            echo 'Deploy failed'
        }
    }
}
